// 無限スクロールの読み込み (カーソル方式で次々に足していく) と、仮想スクロールの範囲計算。
//
// - 取得はサーバーページネーションと同じ fetchPage ({ limit, cursor, search } → { items, nextCursor })
// - 読み込みは TanStack Query の無限クエリ (cursor-query.ts)。loadMore は二重に走らず、
//   検索を変えると最初から読み直し、古い応答は捨てる。前の検索に戻るとキャッシュから出る
// - virtualWindow は「いま見えている行 ± overscan」だけを描くための計算 (行の高さが一定の前提)。
//   1 万件読み込んでも DOM に出る行は画面の分だけになる
import { createStore, type ReadableStore } from "../../store"
import {
  createCursorQuery,
  errorMessage,
  type CursorQueryOptions,
  type FetchPage,
} from "./cursor-query"

export interface InfiniteListOptions<T> extends CursorQueryOptions {
  fetchPage: FetchPage<T>
  /** 1 回に取る件数。@default 50 */
  pageSize?: number
  /** 検索語の入力を待ってから読み直す時間 (ms)。@default 300 */
  searchDebounceMs?: number
}

export interface InfiniteListState<T> {
  items: T[]
  search: string
  loading: boolean
  error: string | null
  /** もう続きが無い。 */
  done: boolean
  /** 読み込んだ回数 (表示・計測用)。 */
  pagesLoaded: number
}

export interface InfiniteListController<T> extends ReadableStore<InfiniteListState<T>> {
  /** 続きを読む (読み込み中・終わりなら何もしない)。 */
  loadMore(): Promise<void>
  setSearch(search: string): void
  /** 最初から読み直す。 */
  reload(): void
  /** 待っている検索のタイマーを止める (読み込み中の応答はそのまま受け取る)。 */
  destroy(): void
}

export function createInfiniteList<T>(options: InfiniteListOptions<T>): InfiniteListController<T> {
  const limit = options.pageSize ?? 50
  const local = createStore({ search: "" })
  const query = createCursorQuery(options.fetchPage, { ...options, search: "", limit })
  let debounce: ReturnType<typeof setTimeout> | undefined
  let applied = "" // query に渡し済みの検索語 (入力中は local.search の方が先に進む)

  let memo: { r: unknown; l: unknown; snap: InfiniteListState<T> } | undefined
  const get = (): InfiniteListState<T> => {
    const r = query.result()
    const l = local.get()
    if (memo && memo.r === r && memo.l === l) return memo.snap
    const pages = l.search === applied ? (r.data?.pages ?? []) : [] // 入力を待っている間は空にする
    const snap: InfiniteListState<T> = {
      items: pages.flatMap((p) => p.items),
      search: l.search,
      loading: r.isFetching,
      error: errorMessage(r.error),
      done: r.isSuccess && !r.hasNextPage,
      pagesLoaded: pages.length,
    }
    memo = { r, l, snap }
    return snap
  }

  const apply = (search: string) => {
    applied = search
    query.setParams(search, limit)
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
    async loadMore() {
      const r = query.result()
      // 初回 (まだ何も無い) は購読で読み始めるので、続きがあるときだけ読む
      if (r.isFetching || !r.hasNextPage || local.get().search !== applied) return
      await query.fetchNextPage()
    },
    setSearch(search) {
      clearTimeout(debounce)
      local.patch({ search })
      const wait = options.searchDebounceMs ?? 300
      if (wait > 0) debounce = setTimeout(() => apply(search), wait)
      else apply(search)
    },
    reload() {
      clearTimeout(debounce)
      apply(local.get().search)
      void query.refetch()
    },
    destroy() {
      // ⚠ query の購読はここで外さない — React の StrictMode は後始末を一度空打ちしてから同じコントローラを
      //   使い続ける (2026-10-02 に踏んだ)。購読はストアの購読者がいなくなったときに外れる。
      clearTimeout(debounce)
    },
  }
}

export interface VirtualWindowInput {
  /** スクロール位置 (px)。 */
  scrollTop: number
  /** 見えている高さ (px)。 */
  viewportHeight: number
  /** 1 行の高さ (px。一定)。 */
  rowHeight: number
  /** 全行数。 */
  count: number
  /** 見えている範囲の外に余分に描く行数 (速くスクロールしても白くならないように)。@default 8 */
  overscan?: number
}

export interface VirtualWindow {
  /** 描く最初の行 (含む)。 */
  start: number
  /** 描く最後の行 (含まない)。 */
  end: number
  /** 描かない上の行の高さ (上の詰め物)。 */
  padTop: number
  /** 描かない下の行の高さ (下の詰め物)。 */
  padBottom: number
  /** 下端までの残り行数 (続きを読むかの判断に使う)。 */
  rowsBelow: number
}

/** 見えている行 ± overscan の範囲と、上下の詰め物の高さ。 */
export function virtualWindow({
  scrollTop,
  viewportHeight,
  rowHeight,
  count,
  overscan = 8,
}: VirtualWindowInput): VirtualWindow {
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight)
  const visible = Math.ceil(viewportHeight / rowHeight)
  const start = Math.max(0, Math.min(count, first - overscan))
  const end = Math.max(start, Math.min(count, first + visible + overscan))
  return {
    start,
    end,
    padTop: start * rowHeight,
    padBottom: (count - end) * rowHeight,
    rowsBelow: Math.max(0, count - (first + visible)),
  }
}
