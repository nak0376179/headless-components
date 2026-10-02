import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createCsvJson,
  csvJsonErrorHeading,
  csvJsonPlaceholder,
  csvJsonResultHeading,
  OUTPUT_FORMATS,
} from "./controller"
import type { ColumnSpec } from "./convert"
import { MAX_ERRORS } from "./convert"

const columns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required" },
  { label: "年齢", key: "age", usage: "optional" },
]

describe("入力画面の状態 (createCsvJson)", () => {
  it("はじめは空の入力・JSON・未変換", () => {
    const c = createCsvJson({ columns })
    expect(c.get()).toEqual({ text: "", format: "json", result: null })
    expect(c.columns).toBe(columns)
  })

  it("setText で入力を差し替える (変換はしない)", () => {
    const c = createCsvJson({ columns })
    c.setText("氏名\n山田")
    expect(c.get().text).toBe("氏名\n山田")
    expect(c.get().result).toBeNull()
  })

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

  it("同じ形式を選び直しても作りなおさない", () => {
    const c = createCsvJson({ columns, text: "氏名\n山田", format: "csv" })
    c.convert()
    const before = c.get().result
    c.setFormat("csv")
    expect(c.get().result).toBe(before)
  })

  it("列定義を差し替えると、変換済みなら新しい定義で変換しなおす", () => {
    const c = createCsvJson({ columns, text: "氏名\n山田" })
    c.setColumns([{ label: "氏名", key: "fullName", usage: "required" }])
    expect(c.get().result).toBeNull() // 未変換のうちは変換しない
    c.convert()
    c.setColumns([{ label: "氏名", key: "shimei", usage: "required" }])
    const r = c.get().result
    expect(r?.ok && r.rows).toEqual([{ shimei: "山田" }])
    expect(c.columns[0].key).toBe("shimei")
  })

  it("onConvert に結果を渡す", () => {
    const onConvert = vi.fn()
    const c = createCsvJson({ columns, onConvert })
    c.convert()
    expect(onConvert).toHaveBeenCalledWith(expect.objectContaining({ ok: false }))
  })
})

describe("変換結果のコピー (copyOutput)", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("変換に成功していればクリップボードに書いて true", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    const c = createCsvJson({ columns, text: "氏名\n山田", format: "csv" })
    c.convert()
    expect(await c.copyOutput()).toBe(true)
    expect(writeText).toHaveBeenCalledWith("name,age\r\n山田,")
  })

  it("クリップボードに書けなければ false", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error()) } })
    const c = createCsvJson({ columns, text: "氏名\n山田" })
    c.convert()
    expect(await c.copyOutput()).toBe(false)
  })

  it("未変換・エラーのときは何もせず false", async () => {
    const writeText = vi.fn()
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    const c = createCsvJson({ columns })
    expect(await c.copyOutput()).toBe(false)
    c.convert() // 空の入力 → エラー
    expect(await c.copyOutput()).toBe(false)
    expect(writeText).not.toHaveBeenCalled()
  })
})

describe("画面の文言", () => {
  it("エラー見出しは上限に達したら「件以上」", () => {
    const err = { row: 1, label: null, message: "x" }
    expect(csvJsonErrorHeading([err])).toBe("エラーが 1件 あります")
    expect(csvJsonErrorHeading(Array(MAX_ERRORS).fill(err))).toBe(
      `エラーが ${MAX_ERRORS}件以上 あります`,
    )
  })

  it("結果の見出しは件数と形式を出す", () => {
    expect(csvJsonResultHeading(2, "json")).toBe("変換結果（2件・JSON）")
  })

  it("入力欄の例は列定義の項目名を並べる", () => {
    expect(csvJsonPlaceholder(columns)).toBe(
      "ここに CSV / TSV を貼り付けてください（1行目はヘッダ）\n例: 氏名, 年齢",
    )
  })

  it("出力形式の選択肢は JSON・CSV・TSV", () => {
    expect(OUTPUT_FORMATS.map((f) => f.label)).toEqual(["JSON", "CSV", "TSV"])
  })
})
