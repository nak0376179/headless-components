// フリーワード検索 (データテーブルの全体検索)。
//
// - 空白 (半角・全角) で区切った語の AND。各語は行のどの列に当たってもよい ("営業 在籍" = 営業部の在籍者)
// - 全角/半角・大文字/小文字・ひらがな/カタカナの違いは無視する
// - 列の値そのものではなく画面に出る文字で探したい列 (状態の表示名・整形した金額など) は
//   列定義の `meta.searchText` で検索用の文字を返す
import type { FilterFn, Row, RowData } from "@tanstack/table-core"

declare module "@tanstack/table-core" {
  // TanStack の型拡張は型引数の名前を揃える必要がある (TData / TValue)
  interface ColumnMeta<TData extends RowData, TValue> {
    /** フリーワード検索で使う文字。省略時は値を文字列にしたもの。 */
    searchText?: (value: TValue, row: TData) => string
  }
}

/** 比べる前にそろえる: NFKC (全角英数・半角カナ) → 小文字 → カタカナをひらがなへ。 */
export function normalizeSearchText(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

/** 検索語に分ける (空白区切り。空なら空配列)。 */
export function splitSearchTerms(query: string): string[] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

// 行ごとの検索用文字列。行オブジェクトは data / columns が変わると作り直されるので WeakMap で足りる。
const rowTextCache = new WeakMap<object, string>()

function rowSearchText<T>(row: Row<T>): string {
  const hit = rowTextCache.get(row)
  if (hit !== undefined) return hit
  const parts: string[] = []
  for (const cell of row.getAllCells()) {
    const column = cell.column
    if (!column.accessorFn) continue
    const value = cell.getValue()
    const toText = column.columnDef.meta?.searchText
    parts.push(toText ? toText(value as never, row.original) : value == null ? "" : String(value))
  }
  // 列の境目をまたいで当たらないよう、語に出てこない文字で区切る
  const text = normalizeSearchText(parts.join("\u0001"))
  rowTextCache.set(row, text)
  return text
}

/** 行がフリーワード検索に当たるか (すべての語を含むか)。 */
export function matchesFreeWord<T>(row: Row<T>, query: string): boolean {
  const terms = splitSearchTerms(query)
  if (terms.length === 0) return true
  const text = rowSearchText(row)
  return terms.every((t) => text.includes(t))
}

/**
 * TanStack の globalFilterFn。TanStack は列ごとに呼んで「どれかの列で true」なら残すので、
 * 列を問わず行全体で判定した結果を返す (同じ行では何度呼ばれても同じ値)。
 */
export const freeWordFilter: FilterFn<unknown> = (row, _columnId, value) =>
  matchesFreeWord(row, String(value ?? ""))
freeWordFilter.autoRemove = (value) => splitSearchTerms(String(value ?? "")).length === 0
