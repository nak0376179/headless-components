// セレクト・AutoComplete の候補の絞り込み (フリーワード検索と同じ規則)。
import { normalizeSearchText, splitSearchTerms } from "../../data-table/free-word"

/**
 * 入力に当たる候補を返す。空白区切りの AND、全角/半角・大文字/小文字・ひらがな/カタカナの違いは無視する。
 * `getText` は候補の検索用の文字 (表示名・読み・別名などをつなげてよい)。
 */
export function filterOptions<O>(
  options: readonly O[],
  input: string,
  getText: (option: O) => string = String,
): O[] {
  const terms = splitSearchTerms(input)
  if (terms.length === 0) return [...options]
  return options.filter((o) => {
    const text = normalizeSearchText(getText(o))
    return terms.every((t) => text.includes(t))
  })
}
