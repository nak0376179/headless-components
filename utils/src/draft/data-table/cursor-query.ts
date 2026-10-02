// カーソル方式の API ({ limit, cursor, search } → { items, nextCursor }) を TanStack Query の
// InfiniteQueryObserver で読む土台。createCursorPager と createInfiniteList が共有する。
//
// - 取得・キャッシュ・古い応答の破棄・再取得は TanStack Query (@tanstack/query-core) に任せる。
//   同じ検索に戻ったときや「前へ」は、取り直さずキャッシュから出る。
// - QueryClient はアプリのもの (React は @tanstack/react-query、Vue は @tanstack/vue-query の useQueryClient())
//   を渡すと、invalidateQueries などがアプリの他の部分と効き合う。渡さなければ utils 内の共有の 1 つを使う。
// - Observer を購読する (= 取りに行く) のは、ストアの購読者がいる間だけ。React の StrictMode のように
//   購読→解除→再購読が起きても、同じコントローラを使い続けられる。サーバー (SSR) では取りに行かない。
import {
  InfiniteQueryObserver,
  isServer,
  QueryClient,
  type InfiniteData,
  type InfiniteQueryObserverResult,
  type QueryKey,
} from "@tanstack/query-core"
import type { Listener } from "../../store"
import type { CursorPage, FetchPage, PageRequest } from "../../data-table/fetch-all"

export type { CursorPage, FetchPage, PageRequest }

/** TanStack Query に渡す設定 (createCursorPager / createInfiniteList 共通)。 */
export interface CursorQueryOptions {
  /** アプリの QueryClient。省略時は utils 内の共有のもの。 */
  queryClient?: QueryClient
  /**
   * キャッシュの鍵の頭。同じ API を別の画面で読むなら揃えるとキャッシュを共有でき、
   * `queryClient.invalidateQueries({ queryKey })` で読み直させられる。省略時はコントローラごとに別。
   */
  queryKey?: QueryKey
  /** 取得したデータを新しいとみなす時間 (ms)。@default 30000 */
  staleTime?: number
}

let sharedClient: QueryClient | undefined
/** queryClient を渡さなかったときに使う、utils 内で共有の QueryClient。 */
export function getDefaultQueryClient(): QueryClient {
  return (sharedClient ??= new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  }))
}

let seq = 0
type Params = { search: string; limit: number }
type Key = readonly unknown[] // [...queryKey, Params]
type Result<T> = InfiniteQueryObserverResult<InfiniteData<CursorPage<T>, string | null>, Error>

export interface CursorQuery<T> {
  /** いまの結果 (購読者がいなくてもキャッシュの状態から作る)。同じ状態なら同じ参照。 */
  result(): Result<T>
  /** 読む条件を変える (鍵が変わる。キャッシュにあればそれが出る)。 */
  setParams(search: string, limit: number): void
  subscribe(listener: Listener): () => void
  fetchNextPage(): Promise<void>
  refetch(): Promise<void>
}

export function createCursorQuery<T>(
  fetchPage: FetchPage<T>,
  opts: CursorQueryOptions & { search: string; limit: number },
): CursorQuery<T> {
  const client = opts.queryClient ?? getDefaultQueryClient()
  const head = opts.queryKey ?? ["hc-cursor", ++seq]
  const options = (search: string, limit: number) => ({
    queryKey: [...head, { search, limit }] as Key,
    queryFn: ({ queryKey, pageParam }: { queryKey: Key; pageParam: string | null }) => {
      const { search, limit } = queryKey[queryKey.length - 1] as Params
      return fetchPage({ limit, cursor: pageParam, search })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last: CursorPage<T>) => last.nextCursor ?? undefined,
    staleTime: opts.staleTime ?? 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const observer = new InfiniteQueryObserver<
    CursorPage<T>,
    Error,
    InfiniteData<CursorPage<T>, string | null>,
    Key,
    string | null
  >(client, options(opts.search, opts.limit))
  let current = options(opts.search, opts.limit)

  const listeners = new Set<Listener>()
  let detach: (() => void) | undefined
  const emit = () => {
    for (const l of [...listeners]) l()
  }

  // 購読者がいないと observer の結果は古いままなので、キャッシュの状態から作り直す (状態が同じなら使い回す)。
  let memo: { state: unknown; options: unknown; result: Result<T> } | undefined
  const stateNow = () => client.getQueryCache().find({ queryKey: observer.options.queryKey })?.state
  const result = (): Result<T> => {
    if (memo && memo.state === stateNow() && memo.options === current) return memo.result
    // 無ければここでキャッシュに作られる
    const r = observer.getOptimisticResult(
      client.defaultQueryOptions(current) as never,
    ) as Result<T>
    memo = { state: stateNow(), options: current, result: r }
    return r
  }

  return {
    result,
    setParams(search, limit) {
      current = options(search, limit)
      observer.setOptions(current)
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      if (listeners.size === 1 && !isServer) detach = observer.subscribe(emit)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          detach?.()
          detach = undefined
        }
      }
    },
    async fetchNextPage() {
      await observer.fetchNextPage()
      emit()
    },
    async refetch() {
      await observer.refetch()
      emit()
    },
  }
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : e ? String(e) : null)
