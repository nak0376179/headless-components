// 日本語の入力で起きやすいことの確認。貼り付けるのは主に Excel・Web ページ・メールからのコピー。
import { describe, expect, it } from "vitest"
import { convertDelimitedText, type ColumnSpec } from "./convert"
import { email, hankaku, hiragana, numeric, zenkaku, zenkakuKatakana } from "./validators"

const columns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required", maxLength: 5 },
  { label: "フリガナ", key: "kana", usage: "optional", validate: zenkakuKatakana() },
  { label: "年齢", key: "age", usage: "optional", validate: numeric() },
  { label: "メール", key: "email", usage: "optional", validate: email() },
  { label: "備考", key: "note", usage: "optional" },
]

const convert = (text: string) => convertDelimitedText(text, columns)
const rows = (text: string) => {
  const r = convert(text)
  if (!r.ok) throw new Error(r.errors.map((e) => e.message).join("\n"))
  return r.rows
}
const messages = (text: string) => {
  const r = convert(text)
  return r.ok ? [] : r.errors.map((e) => e.message)
}

describe("Excel からのコピー", () => {
  it("2 列 × 1 行の小さな表でもタブ区切りと分かる (行末は CRLF)", () => {
    expect(rows("氏名\t備考\r\n山田\tあ\r\n")).toEqual([
      { name: "山田", kana: "", age: "", email: "", note: "あ" },
    ])
  })

  it("セルの中の改行 (Alt+Enter) は引用符ごと 1 つの値になる", () => {
    expect(rows('氏名\t備考\r\n山田\t"1行目\n2行目"\r\n佐藤\tなし\r\n').map((r) => r.note)).toEqual(
      ["1行目\n2行目", "なし"],
    )
  })

  it("UTF-8 の BOM が付いていても、先頭の項目名を読み違えない", () => {
    expect(rows("﻿氏名,年齢\n山田,30")[0]).toMatchObject({ name: "山田", age: "30" })
  })

  it("ヘッダの前後の全角スペースも取り除いて項目名を突き合わせる", () => {
    expect(rows("　氏名　\t　年齢\n山田\t30")[0]).toMatchObject({ name: "山田", age: "30" })
  })

  it("タブ区切りでも、値に半角カンマがあればエラーにする", () => {
    expect(messages("氏名\t備考\n山田\tA,B,C")).toEqual([
      "2行目: 「備考」にカンマ（,）は使えません",
    ])
  })
})

describe("全角の記号・空白", () => {
  it("全角の読点「、」とカンマ「，」は区切りにならない", () => {
    expect(rows("氏名,備考\n山田,東京、大阪")[0].note).toBe("東京、大阪")
    expect(rows("氏名,備考\n山田,東京，大阪")[0].note).toBe("東京，大阪")
  })

  it("全角の引用符「“”」は引用符として扱わない (中のカンマで列が増えてエラー)", () => {
    expect(messages("氏名,備考\n山田,“東京,大阪”")).toEqual([
      "2行目: 項目が多すぎます（2列必要ですが3列です）",
    ])
  })

  it("全角スペース・ノーブレークスペースは前後から取り除き、途中は残す", () => {
    expect(rows("氏名\n　山田　太郎　")[0].name).toBe("山田　太郎")
    expect(rows("氏名\n 山田 ")[0].name).toBe("山田")
  })

  it("全角スペースだけの項目名は空の項目名としてエラー", () => {
    expect(messages("氏名,　\n山田,x")).toEqual(["ヘッダ: 2列目の項目名が空です"])
  })

  it("全角スペースだけの行は空行として読み飛ばす", () => {
    expect(rows("氏名\n山田\n　　\n佐藤").map((r) => r.name)).toEqual(["山田", "佐藤"])
  })

  it("ゼロ幅スペース (Web からのコピーで混じる) は取り除かず、値に残る", () => {
    expect(rows("氏名\n​山田")[0].name).toBe("​山田")
  })
})

describe("文字数の数え方", () => {
  it("漢字・かなは 1 文字ずつ数える", () => {
    expect(rows("氏名\n山田花子")[0].name).toBe("山田花子")
    expect(messages("氏名\n寿限無寿限無")).toEqual([
      "2行目: 「氏名」は5文字以内で入力してください（現在6文字）",
    ])
  })

  it("「𠮷」のようなサロゲートペアの漢字も 1 文字と数える", () => {
    expect(rows("氏名\n𠮷野家家家")[0].name).toBe("𠮷野家家家")
    expect(messages("氏名\n𠮷野家家家家")).toEqual([
      "2行目: 「氏名」は5文字以内で入力してください（現在6文字）",
    ])
  })

  it("濁点が分かれた文字 (Mac のファイル名などの NFD) は 2 文字と数える", () => {
    // 「がぎぐ」を「か + ゛」の形で書くと 6 文字になる (正規化はしない)
    expect(messages("氏名\nがぎぐ")).toEqual([
      "2行目: 「氏名」は5文字以内で入力してください（現在6文字）",
    ])
  })

  it("機種依存文字 (①・㈱・髙) はそのまま通す", () => {
    expect(rows("氏名,備考\n髙橋,①②Ⅲ㈱")[0]).toMatchObject({ name: "髙橋", note: "①②Ⅲ㈱" })
  })
})

describe("全角・半角の扱い (変換はせず、検査で弾く)", () => {
  it("全角数字は numeric() で弾く (半角に直さない)", () => {
    expect(messages("氏名,年齢\n山田,３０")).toEqual([
      "2行目: 「年齢」が不正です（数値で入力してください）",
    ])
  })

  it("全角英字のメールアドレスは email() で弾く", () => {
    expect(messages("氏名,メール\n山田,ｔａｒｏ＠ｅｘａｍｐｌｅ．ｃｏｍ")).toEqual([
      "2行目: 「メール」が不正です（メールアドレスの形式ではありません）",
    ])
  })

  it("半角カナのフリガナは zenkakuKatakana() で弾く", () => {
    expect(messages("氏名,フリガナ\n山田,ﾔﾏﾀﾞ")).toEqual([
      "2行目: 「フリガナ」が不正です（全角カタカナで入力してください）",
    ])
  })

  it("項目名は全角・半角を区別する (半角カナの「ﾌﾘｶﾞﾅ」は別の項目)", () => {
    expect(messages("氏名,ﾌﾘｶﾞﾅ\n山田,ヤマダ")).toEqual([
      "ヘッダ: 「ﾌﾘｶﾞﾅ」は定義されていない項目です",
    ])
  })
})

describe("フリガナ・ひらがな", () => {
  it("長音符「ー」は全角カタカナとして通す", () => {
    expect(rows("氏名,フリガナ\n山田,ヤマダー")[0].kana).toBe("ヤマダー")
  })

  it("姓と名の間の全角スペース・中点「・」は zenkakuKatakana() では弾く", () => {
    expect(messages("氏名,フリガナ\n山田,ヤマダ　タロウ")).toHaveLength(1)
    expect(messages("氏名,フリガナ\n山田,ヤマダ・タロウ")).toHaveLength(1)
  })

  it("ひらがなのフリガナは zenkakuKatakana() で弾く", () => {
    expect(messages("氏名,フリガナ\n山田,やまだ")).toEqual([
      "2行目: 「フリガナ」が不正です（全角カタカナで入力してください）",
    ])
  })

  it("hiragana() は長音符を含むひらがなを通す", () => {
    expect(hiragana()("やまだー")).toBeNull()
    expect(hiragana()("ヤマダ")).toBe("ひらがなで入力してください")
  })
})

describe("全角・半角の検査", () => {
  it("zenkaku() は全角を 1 文字でも含めば通す (「第1部」は通り、「ABC」は弾く)", () => {
    expect(zenkaku()("第1部")).toBeNull()
    expect(zenkaku()("ABC")).toBe("全角を含めて入力してください")
  })

  it("hankaku() は半角カナを通し、ひらがなは弾く", () => {
    expect(hankaku()("ｱｲｳ")).toBeNull()
    expect(hankaku()("あ")).toBe("半角で入力してください")
  })
})
