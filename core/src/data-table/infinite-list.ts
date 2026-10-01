// 無限スクロールの読み込み (カーソル方式で次々に足していく) と、仮想スクロールの範囲計算。
//
// - 取得はサーバーページネーションと同じ fetchPage ({ limit, cursor, search } → { items, nextCursor })
// - loadMore は二重に走らない。検索を変えると最初から読み直し、古い応答は捨てる
// - virtualWindow は「いま見えている行 ± overscan」だけを描くための計算 (行の高さが一定の前提)。
//   1 万件読み込んでも DOM に出る行は画面の分だけになる
import { createStore, type ReadableStore } from "../store"
import type { FetchPage } from "./cursor-pager"

export interface InfiniteListOptions<T> {
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
  let cursor: string | null = null
  let generation = 0
  let debounce: ReturnType<typeof setTimeout> | undefined
  const store = createStore<InfiniteListState<T>>({
    items: [],
    search: "",
    loading: false,
    error: null,
    done: false,
    pagesLoaded: 0,
  })

  const loadMore = async () => {
    const s = store.get()
    if (s.loading || s.done) return
    const gen = generation
    store.patch({ loading: true, error: null })
    try {
      const page = await options.fetchPage({ limit, cursor, search: s.search })
      if (gen !== generation) return // 検索を変えた後に届いた古い応答
      cursor = page.nextCursor
      const now = store.get()
      store.patch({
        items: [...now.items, ...page.items],
        loading: false,
        done: page.nextCursor === null,
        pagesLoaded: now.pagesLoaded + 1,
      })
    } catch (e) {
      if (gen !== generation) return
      store.patch({ loading: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  const restart = (search: string) => {
    generation++
    cursor = null
    store.patch({ items: [], search, loading: false, error: null, done: false, pagesLoaded: 0 })
  }

  void loadMore()

  return {
    get: store.get,
    subscribe: store.subscribe,
    loadMore,
    setSearch(search) {
      restart(search)
      clearTimeout(debounce)
      const wait = options.searchDebounceMs ?? 300
      if (wait > 0) debounce = setTimeout(() => void loadMore(), wait)
      else void loadMore()
    },
    reload() {
      clearTimeout(debounce)
      restart(store.get().search)
      void loadMore()
    },
    destroy() {
      // ⚠ 世代は進めない — React の StrictMode は後始末を一度空打ちしてから同じコントローラを使い続けるので、
      //   ここで応答を捨てると「読み込み中」のまま止まる (2026-10-02 に踏んだ)。止めるのは待ちのタイマーだけ。
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
