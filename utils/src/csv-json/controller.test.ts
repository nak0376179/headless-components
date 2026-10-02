import { describe, expect, it, vi } from "vitest"
import { createCsvJson, csvJsonErrorHeading } from "./controller"
import type { ColumnSpec } from "./convert"
import { MAX_ERRORS } from "./convert"

const columns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required" },
  { label: "年齢", key: "age", usage: "optional" },
]

describe("createCsvJson", () => {
  it("変換結果をストアに載せて購読者に通知する", () => {
    const c = createCsvJson({ columns, text: "氏名,年齢\n山田,30" })
    const listener = vi.fn()
    c.subscribe(listener)
    const result = c.convert()
    expect(result.ok).toBe(true)
    expect(c.get().result).toBe(result)
    expect(listener).toHaveBeenCalled()
  })

  it("変換済みなら形式の切り替えで出力を作りなおす", () => {
    const c = createCsvJson({ columns, text: "氏名,年齢\n山田,30" })
    c.setFormat("csv")
    expect(c.get().result).toBeNull() // 未変換のうちは変換しない
    c.convert()
    c.setFormat("tsv")
    const r = c.get().result
    expect(r?.ok && r.output).toBe("name\tage\r\n山田\t30")
  })

  it("onConvert に結果を渡す", () => {
    const onConvert = vi.fn()
    const c = createCsvJson({ columns, onConvert })
    c.convert()
    expect(onConvert).toHaveBeenCalledWith(expect.objectContaining({ ok: false }))
  })

  it("エラー見出しは上限に達したら「件以上」", () => {
    const err = { row: 1, label: null, message: "x" }
    expect(csvJsonErrorHeading([err])).toBe("エラーが 1件 あります")
    expect(csvJsonErrorHeading(Array(MAX_ERRORS).fill(err))).toBe(
      `エラーが ${MAX_ERRORS}件以上 あります`,
    )
  })
})
