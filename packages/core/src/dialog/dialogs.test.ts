import { describe, expect, it } from "vitest"
import { createDialogs } from "./dialogs"

const top = (d: ReturnType<typeof createDialogs>) => {
  const e = d.get().stack.at(-1)
  if (!e) throw new Error("開いていない")
  return e
}

describe("createDialogs", () => {
  it("confirm は OK で true、キャンセルで false を返して閉じる", async () => {
    const d = createDialogs()
    const a = d.confirm({ title: "削除しますか？", danger: true })
    expect(top(d)).toMatchObject({ kind: "confirm", okLabel: "削除", danger: true })
    await d.accept(top(d).id)
    expect(await a).toBe(true)
    const b = d.confirm({ title: "?" })
    d.dismiss(top(d).id)
    expect(await b).toBe(false)
    expect(d.get().stack).toHaveLength(0)
  })

  it("onConfirm の間は busy で閉じず、失敗したら error を出して開いたまま", async () => {
    const d = createDialogs()
    let fail = true
    const p = d.confirm({
      title: "送信",
      onConfirm: () => (fail ? Promise.reject(new Error("通信に失敗しました")) : Promise.resolve()),
    })
    const id = top(d).id
    const run = d.accept(id)
    expect(top(d).busy).toBe(true)
    d.dismiss(id) // busy の間は閉じない
    await run
    expect(top(d)).toMatchObject({ busy: false, error: "通信に失敗しました" })
    fail = false
    await d.accept(id)
    expect(await p).toBe(true)
  })

  it("prompt は検査が通るまで OK できず、入力した文字を返す", async () => {
    const d = createDialogs()
    const p = d.prompt({ title: "名前", validate: (v) => (v.trim() ? null : "入力してください") })
    const id = top(d).id
    expect(top(d).input?.error).toBe("入力してください")
    await d.accept(id)
    expect(d.get().stack).toHaveLength(1)
    d.setInput(id, "新しい名前")
    await d.accept(id)
    expect(await p).toBe("新しい名前")
  })

  it("重ねて開け、dismissAll でまとめてキャンセルになる", async () => {
    const d = createDialogs()
    const a = d.confirm({ title: "1" })
    const b = d.prompt({ title: "2" })
    expect(d.get().stack.map((e) => e.title)).toEqual(["1", "2"])
    d.dismissAll()
    expect([await a, await b]).toEqual([false, null])
  })
})
