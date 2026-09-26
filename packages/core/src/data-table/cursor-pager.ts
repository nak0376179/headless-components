// カーソル (nextCursor) 方式のサーバーページネーションを扱うヘッドレスなコントローラ。
// DynamoDB の LastEvaluatedKey のように「次ページの鍵」しか返らない API を前提に、
// 訪れたページのカーソルを積んでおいて「前へ」を実現する。
import { createStore, type ReadableStore } from "../store"

export interface PageRequest {
  limit: number
  cursor: string | null
  search: string
}

export interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
  /** 返却件数 (省略時は items.length)。 */
  count?: number
  /** サーバー側で評価した件数 (DynamoDB の ScannedCount 相当。任意)。 */
  scannedCount?: number
}

export type FetchPage<T> = (req: PageRequest) => Promise<CursorPage<T>>

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
  /** 現在ページを取り直す (作成・更新・削除のあとなど)。 */
  reload(): Promise<void>
}

export interface CursorPagerOptions<T> {
  fetchPage: FetchPage<T>
  pageSize?: number
  /** 検索語の入力から取得までの待ち時間 (ms)。既定 0。 */
  searchDebounceMs?: number
}

export function createCursorPager<T>(options: CursorPagerOptions<T>): CursorPagerController<T> {
  let cursors: (string | null)[] = [null]
  let requestId = 0
  let debounce: ReturnType<typeof setTimeout> | undefined

  const store = createStore<CursorPagerState<T>>({
    page: null,
    pageIndex: 0,
    pageSize: options.pageSize ?? 10,
    search: "",
    loading: false,
    error: null,
    hasPrev: false,
    hasNext: false,
  })

  const load = async () => {
    const id = ++requestId
    const { pageIndex, pageSize, search } = store.get()
    store.patch({ loading: true, error: null })
    try {
      const page = await options.fetchPage({ limit: pageSize, cursor: cursors[pageIndex], search })
      if (id !== requestId) return // 後から出したリクエストを優先する
      cursors[pageIndex + 1] = page.nextCursor
      store.patch({
        page,
        loading: false,
        hasPrev: pageIndex > 0,
        hasNext: page.nextCursor !== null,
      })
    } catch (e) {
      if (id !== requestId) return
      store.patch({ loading: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  const restart = (patch: Partial<CursorPagerState<T>>) => {
    cursors = [null]
    store.patch({ ...patch, pageIndex: 0 })
  }

  void load()

  return {
    get: store.get,
    subscribe: store.subscribe,
    next() {
      const s = store.get()
      if (!s.hasNext || s.loading) return
      store.patch({ pageIndex: s.pageIndex + 1 })
      void load()
    },
    prev() {
      const s = store.get()
      if (s.pageIndex === 0 || s.loading) return
      store.patch({ pageIndex: s.pageIndex - 1 })
      void load()
    },
    setSearch(search) {
      restart({ search })
      clearTimeout(debounce)
      const wait = options.searchDebounceMs ?? 0
      if (wait > 0) debounce = setTimeout(() => void load(), wait)
      else void load()
    },
    setPageSize(pageSize) {
      restart({ pageSize })
      void load()
    },
    reload: load,
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
