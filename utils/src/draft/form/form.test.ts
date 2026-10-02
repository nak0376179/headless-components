import { describe, expect, it, vi } from "vitest"
import { email } from "../../csv-json"
import {
  countBetween,
  createForm,
  filterOptions,
  maxChars,
  required,
  toggleInList,
  whenFilled,
} from "."

type V = { name: string; mail: string; pref: string | null; hobbies: string[]; plan: string }
const initial: V = { name: "", mail: "", pref: null, hobbies: [], plan: "free" }
const make = (onSubmit = vi.fn()) =>
  createForm<V>({
    initial,
    rules: {
      name: [required(), maxChars(5)],
      mail: whenFilled(email()),
      pref: required("選んでください"),
      hobbies: countBetween(1, 2),
    },
    onSubmit,
  })

describe("createForm", () => {
  it("エラーは触れるか送信を押すまで出さない", async () => {
    const f = make()
    expect(f.get().errors.name).toBe("入力してください")
    expect(f.fieldError("name")).toBeNull()
    f.touch("name")
    expect(f.fieldError("name")).toBe("入力してください")
    expect(f.fieldError("pref")).toBeNull()
    expect(await f.submit()).toBe(false)
    expect(f.fieldError("pref")).toBe("選んでください")
  })
  it("検査が順に当たり、空のときは whenFilled が通す", () => {
    const f = make()
    f.setValue("name", "とても長い名前")
    expect(f.get().errors.name).toBe("5 文字以内で入力してください")
    expect(f.get().errors.mail).toBeUndefined()
    f.setValue("mail", "x@")
    expect(f.get().errors.mail).toBe("メールアドレスの形式ではありません")
  })
  it("通れば onSubmit を呼び、dirty と reset が効く", async () => {
    const onSubmit = vi.fn()
    const f = make(onSubmit)
    f.setValue("name", "山田")
    f.setValue("pref", "tokyo")
    f.setValue("hobbies", ["read"])
    expect(f.get().dirty).toBe(true)
    expect(await f.submit()).toBe(true)
    expect(onSubmit).toHaveBeenCalledWith({
      ...initial,
      name: "山田",
      pref: "tokyo",
      hobbies: ["read"],
    })
    f.reset()
    expect(f.get().values).toEqual(initial)
    expect(f.get().dirty).toBe(false)
  })
  it("onSubmit の例外は submitError に入る", async () => {
    const f = make(
      vi.fn(() => {
        throw new Error("保存に失敗しました")
      }),
    )
    f.setValue("name", "a")
    f.setValue("pref", "p")
    f.setValue("hobbies", ["x"])
    expect(await f.submit()).toBe(false)
    expect(f.get().submitError).toBe("保存に失敗しました")
    expect(f.get().submitting).toBe(false)
  })
})

describe("toggleInList / filterOptions", () => {
  it("一覧の順に揃えて出し入れする", () => {
    const order = ["a", "b", "c"]
    expect(toggleInList(["c"], "a", order)).toEqual(["a", "c"])
    expect(toggleInList(["a", "c"], "a", order)).toEqual(["c"])
  })
  it("候補はかな・全角半角の違いを無視して AND で絞る", () => {
    const prefs = [
      { label: "東京都", kana: "とうきょうと" },
      { label: "京都府", kana: "きょうとふ" },
      { label: "大阪府", kana: "おおさかふ" },
    ]
    const text = (p: (typeof prefs)[number]) => `${p.label} ${p.kana}`
    expect(filterOptions(prefs, "キョウト", text).map((p) => p.label)).toEqual(["東京都", "京都府"])
    expect(filterOptions(prefs, "きょうと ふ", text).map((p) => p.label)).toEqual(["京都府"])
    expect(filterOptions(prefs, "", text)).toHaveLength(3)
  })
})
