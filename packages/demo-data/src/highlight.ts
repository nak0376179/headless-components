// デモのページ下部に出すコード例の色付け (字句の切り分けだけ。色は各アプリが当てる)。
// 本格的な構文解析はしない — コメント・文字列・キーワード・タグ・数値を正規表現で拾う。

export type CodeTokenKind = "comment" | "string" | "keyword" | "tag" | "number" | "attr" | "plain"
export interface CodeToken {
  kind: CodeTokenKind
  text: string
}

const KEYWORDS = new Set(
  (
    "import from export const let function return if else async await type interface new for of " +
    "in true false null undefined as default void typeof extends"
  ).split(" "),
)

// 先に書いた物ほど優先 (コメントの中の文字列などを取り違えないため)。
// シェルだけ `#` をコメントにする (Vue の `#secret` スロットや TS の `#private` を巻き込まない)。
const REST =
  /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(<\/?[A-Za-z][\w.-]*|\/?>)|(\b\d[\d_.]*\b)|([:@#]?[a-zA-Z-]+(?==))|(\b[A-Za-z_]\w*\b)/
const token = (comment: RegExp) => new RegExp(`(${comment.source})|${REST.source}`, "g")
const TOKEN_RE = token(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/)
const TOKEN_RE_SH = token(/#[^\n]*/)

/** コードを色付け用の字句に分ける。`lang` が "sh" のときだけ `#` を行コメントとして扱う。 */
export function tokenizeCode(code: string, lang: string): CodeToken[] {
  const out: CodeToken[] = []
  let last = 0
  const push = (kind: CodeTokenKind, text: string) => {
    if (!text) return
    const prev = out[out.length - 1]
    if (prev && prev.kind === kind) prev.text += text
    else out.push({ kind, text })
  }
  for (const m of code.matchAll(lang === "sh" ? TOKEN_RE_SH : TOKEN_RE)) {
    const i = m.index ?? 0
    push("plain", code.slice(last, i))
    const [all, comment, str, tag, num, attr, word] = m
    if (comment !== undefined) push("comment", comment)
    else if (str !== undefined) push("string", str)
    else if (tag !== undefined) push("tag", tag)
    else if (num !== undefined) push("number", num)
    else if (attr !== undefined) push("attr", attr)
    else if (word !== undefined) push(KEYWORDS.has(word) ? "keyword" : "plain", word)
    else push("plain", all)
    last = i + all.length
  }
  push("plain", code.slice(last))
  return out
}

/** 字句の種類ごとの色 (暗い背景向け。React / Vue で同じ色にする)。 */
export const CODE_TOKEN_COLORS: Record<CodeTokenKind, string> = {
  comment: "#7f8c98",
  string: "#a5d6a7",
  keyword: "#c792ea",
  tag: "#82aaff",
  number: "#f78c6c",
  attr: "#ffcb6b",
  plain: "#e6edf3",
}

/** ページ下部の「コードの使い方」の 1 ブロック。 */
export interface UsageBlock {
  /** 見出し (例「列を定義する」)。 */
  title: string
  /** 補足 (1〜2 文)。 */
  note?: string
  /** 色付けの言語 ("tsx" / "ts" / "vue" / "sh")。 */
  lang: string
  /** ファイル名の表示 (例 "columns.ts")。 */
  file?: string
  code: string
}
