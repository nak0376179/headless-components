// ブラウザ内だけで動くデータソース。バックエンドを立てずに、カーソル方式の API
// (一覧・作成・更新・削除) をそのまま真似る。デモやテストの「サーバー」役。
import type { CursorPage, PageRequest } from "./fetch-all"

export interface MemorySourceOptions<T> {
  items: T[]
  /** 主キー (重複禁止)。 */
  getKey: (item: T) => string
  /** 検索語にマッチするか。省略時は文字列値のどれかに部分一致 (大文字小文字は無視)。 */
  matches?: (item: T, search: string) => boolean
  /** 応答の遅延 (ms)。ローディング表示の確認用。 */
  latencyMs?: number
}

export interface MemorySource<T> {
  fetchPage(req: PageRequest): Promise<CursorPage<T>>
  create(item: T): Promise<T>
  update(key: string, item: T): Promise<T>
  remove(key: string): Promise<void>
  /** 現在の全件 (コピー)。 */
  all(): T[]
}

const defaultMatches = <T>(item: T, search: string) =>
  Object.values(item as Record<string, unknown>).some(
    (v) => typeof v === "string" && v.toLowerCase().includes(search.toLowerCase()),
  )

// カーソルは「次に読む位置」を不透明な文字列にしたもの (API の内部表現を UI に漏らさない)。
const encodeCursor = (offset: number) => btoa(JSON.stringify({ offset }))
const decodeCursor = (cursor: string): number => {
  try {
    const { offset } = JSON.parse(atob(cursor)) as { offset: unknown }
    if (typeof offset === "number" && offset >= 0) return offset
  } catch {
    // 下の throw に落とす
  }
  throw new Error("不正なカーソルです")
}

export function createMemorySource<T>(options: MemorySourceOptions<T>): MemorySource<T> {
  const items = [...options.items]
  const { getKey } = options
  const matches = options.matches ?? defaultMatches
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, options.latencyMs ?? 0))
  const indexOf = (key: string) => items.findIndex((it) => getKey(it) === key)

  return {
    async fetchPage({ limit, cursor, search }) {
      await wait()
      if (!Number.isInteger(limit) || limit < 1) throw new Error("limit は 1 以上の整数")
      const hits = search ? items.filter((it) => matches(it, search)) : items
      const start = cursor ? decodeCursor(cursor) : 0
      const page = hits.slice(start, start + limit)
      const end = start + page.length
      return {
        items: page,
        nextCursor: end < hits.length ? encodeCursor(end) : null,
        count: page.length,
        scannedCount: page.length,
      }
    },
    async create(item) {
      await wait()
      if (indexOf(getKey(item)) >= 0) throw new Error(`${getKey(item)} は既に存在します`)
      items.push(item)
      return item
    },
    async update(key, item) {
      await wait()
      const i = indexOf(key)
      if (i < 0) throw new Error(`${key} が見つかりません`)
      if (getKey(item) !== key) throw new Error("主キーは変更できません")
      items[i] = item
      return item
    },
    async remove(key) {
      await wait()
      const i = indexOf(key)
      if (i < 0) throw new Error(`${key} が見つかりません`)
      items.splice(i, 1)
    },
    all: () => [...items],
  }
}
