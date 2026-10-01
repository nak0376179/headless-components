import { describe, expect, it } from "vitest"
import { tokenizeCode } from "./highlight"

const kinds = (code: string, lang = "ts") =>
  tokenizeCode(code, lang)
    .filter((t) => t.kind !== "plain")
    .map((t) => `${t.kind}:${t.text}`)

describe("tokenizeCode", () => {
  it("つなげると元のコードに戻る", () => {
    const code = 'import { a } from "x" // c\nconst n = 42\n<Foo bar="1" />'
    expect(
      tokenizeCode(code, "tsx")
        .map((t) => t.text)
        .join(""),
    ).toBe(code)
  })
  it("コメント・文字列・キーワード・数値・タグ・属性を拾う", () => {
    expect(kinds('const s = "a // b" // 注釈')).toEqual([
      "keyword:const",
      'string:"a // b"',
      "comment:// 注釈",
    ])
    expect(kinds("x = 42")).toEqual(["number:42"])
    expect(kinds('<CsvJsonTextArea :rows="10" />', "vue")).toEqual([
      "tag:<CsvJsonTextArea",
      "attr::rows",
      'string:"10"',
      "tag:/>",
    ])
  })
  it("# はシェルだけコメントにする", () => {
    expect(kinds("pnpm vendor ../app # 取り込む", "sh")).toEqual(["comment:# 取り込む"])
    expect(kinds('<template #secret="{ close }">', "vue")).toContain("attr:#secret")
  })
})
