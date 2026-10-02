// カーソル方式の API の型と、全件をまとめて取る関数。
// データテーブル (クライアント側でページング・検索) は、TanStack Query の queryFn で
// fetchAllPages を呼んで全件を受け取り、そのまま createDataTable / DataTable に渡す。

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
