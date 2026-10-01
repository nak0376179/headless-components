// カーソル (nextCursor) 方式のサーバーページネーションを扱うヘッドレスなコントローラ。
// DynamoDB の LastEvaluatedKey のように「次ページの鍵」しか返らない API を前提にする。
//
// 読んだページは TanStack Query の無限クエリとして順に積み、いま見ている 1 ページだけを出す。
// そのため「前へ」と、一度見たページへの「次へ」はキャッシュから即座に出る (取りに行かない)。
import { createStore, type ReadableStore } from "../store"
import {
  createCursorQuery,
  errorMessage,
  type CursorPage,
  type CursorQueryOptions,
  type FetchPage,
} from "./cursor-query"

export type { CursorPage, FetchPage, PageRequest } from "./cursor-query"

export interface CursorPagerState<T> {
  /** 現在ページ。初回取得が終わるまでは null。 */
  page: CursorPage<T> | null
  pageIndex: number
  pageSize: number
  search: string
  loading: boolean
  error: string | null
  hasPrev: boolean
  hasNext: boolean
}

export interface CursorPagerController<T> extends ReadableStore<CursorPagerState<T>> {
  next(): void
  prev(): void
  /** 検索語を変える (1 ページ目からやり直す)。 */
  setSearch(search: string): void
  /** ページサイズを変える (1 ページ目からやり直す)。 */
  setPageSize(size: number): void
  /** 読んだページを取り直す (作成・更新・削除のあとなど)。 */
  reload(): Promise<void>
  /** 待っている検索のタイマーを止める。 */
  destroy(): void
}

export interface CursorPagerOptions<T> extends CursorQueryOptions {
  fetchPage: FetchPage<T>
  pageSize?: number
  /** 検索語の入力から取得までの待ち時間 (ms)。既定 0。 */
  searchDebounceMs?: number
}

export function createCursorPager<T>(options: CursorPagerOptions<T>): CursorPagerController<T> {
  // 画面側の状態 (どのページを見ているか・入力中の検索語)。取得の状態は query が持つ。
  const local = createStore({ pageIndex: 0, pageSize: options.pageSize ?? 10, search: "" })
  const query = createCursorQuery(options.fetchPage, {
    ...options,
    search: "",
    limit: local.get().pageSize,
  })
  let debounce: ReturnType<typeof setTimeout> | undefined

  let memo: { r: unknown; l: unknown; snap: CursorPagerState<T> } | undefined
  const get = (): CursorPagerState<T> => {
    const r = query.result()
    const l = local.get()
    if (memo && memo.r === r && memo.l === l) return memo.snap
    const pages = r.data?.pages ?? []
    const snap: CursorPagerState<T> = {
      page: pages[l.pageIndex] ?? pages[pages.length - 1] ?? null,
      pageIndex: l.pageIndex,
      pageSize: l.pageSize,
      search: l.search,
      loading: r.isFetching,
      error: errorMessage(r.error),
      hasPrev: l.pageIndex > 0,
      hasNext: l.pageIndex < pages.length - 1 || r.hasNextPage,
    }
    memo = { r, l, snap }
    return snap
  }

  const restart = (patch: { search?: string; pageSize?: number }) => {
    local.patch({ ...patch, pageIndex: 0 })
    const { search, pageSize } = local.get()
    query.setParams(search, pageSize)
  }

  return {
    get,
    subscribe(listener) {
      const offQuery = query.subscribe(listener)
      const offLocal = local.subscribe(listener)
      return () => {
        offQuery()
        offLocal()
      }
    },
    next() {
      const s = get()
      if (!s.hasNext || s.loading) return
      const loaded = query.result().data?.pages.length ?? 0
      const target = s.pageIndex + 1
      if (target < loaded) local.patch({ pageIndex: target })
      else void query.fetchNextPage().then(() => local.patch({ pageIndex: target }))
    },
    prev() {
      const s = get()
      if (s.pageIndex === 0 || s.loading) return
      local.patch({ pageIndex: s.pageIndex - 1 })
    },
    setSearch(search) {
      clearTimeout(debounce)
      const wait = options.searchDebounceMs ?? 0
      if (wait <= 0) return restart({ search })
      local.patch({ search, pageIndex: 0 })
      debounce = setTimeout(() => restart({ search }), wait)
    },
    setPageSize(pageSize) {
      restart({ pageSize })
    },
    reload: () => query.refetch(),
    destroy() {
      clearTimeout(debounce)
    },
  }
}

/** カーソルが尽きるまで chunkSize ずつ取り、全件を結合して返す (1 レスポンスを小さく保つため)。 */
export async function fetchAllPages<T>(
  fetchPage: FetchPage<T>,
  chunkSize = 25,
  search = "",
): Promise<T[]> {
  const items: T[] = []
  let cursor: string | null = null
  do {
    const page: CursorPage<T> = await fetchPage({ limit: chunkSize, cursor, search })
    items.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)
  return items
}
