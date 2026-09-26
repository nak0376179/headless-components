import { describe, expect, it } from "vitest"
import {
  combine,
  email,
  hankaku,
  hiragana,
  numeric,
  oneOf,
  pattern,
  zenkaku,
  zenkakuKatakana,
} from "./validators"

describe("バリデータ・ビルダー", () => {
  it("全角チェックは全角を含めば通し、半角の混在も許可する", () => {
    const v = zenkaku()
    expect(v("開発部")).toBeNull()
    expect(v("山田太郎")).toBeNull()
    expect(v("第1開発部")).toBeNull() // 全角＋半角の混在は許可
    expect(v("開発1")).toBeNull() // 半角数字が混じっても全角を含むので通る
    expect(v("Dev")).toBe("全角を含めて入力してください") // 半角だけは弾く
    expect(v("ﾃｽﾄ")).toBe("全角を含めて入力してください") // 半角カナだけも弾く
  })

  it("半角チェックは半角のみ通す", () => {
    const v = hankaku()
    expect(v("Dev123")).toBeNull()
    expect(v("ﾃｽﾄ")).toBeNull() // 半角カナ
    expect(v("開発部")).toBe("半角で入力してください")
  })

  it("全角カタカナチェックは全角カタカナ（＋長音符）のみ通す", () => {
    const v = zenkakuKatakana()
    expect(v("ヤマダタロウ")).toBeNull()
    expect(v("コーヒー")).toBeNull()
    expect(v("やまだ")).toBe("全角カタカナで入力してください") // ひらがな
    expect(v("ﾔﾏﾀﾞ")).toBe("全角カタカナで入力してください") // 半角カナ
  })

  it("ひらがなチェックはひらがな（＋長音符）のみ通す", () => {
    const v = hiragana()
    expect(v("やまだたろう")).toBeNull()
    expect(v("ヤマダ")).toBe("ひらがなで入力してください")
  })

  it("数値チェックは半角数字のみ通す", () => {
    const v = numeric()
    expect(v("30")).toBeNull()
    expect(v("３０")).toBe("数値で入力してください") // 全角数字
    expect(v("abc")).toBe("数値で入力してください")
  })

  it("メールチェックはメール形式のみ通す", () => {
    const v = email()
    expect(v("taro@example.com")).toBeNull()
    expect(v("not-an-email")).toBe("メールアドレスの形式ではありません")
  })

  it("候補チェック（oneOf）は候補のいずれかのみ通す", () => {
    const v = oneOf(["開発部", "営業部"])
    expect(v("開発部")).toBeNull()
    expect(v("総務部")).toBe("開発部 / 営業部 のいずれかで入力してください")
    expect(oneOf(["A"], "AだけOK")("B")).toBe("AだけOK")
  })

  it("正規表現チェック（pattern）は任意の正規表現でチェックできる", () => {
    const v = pattern(/^\d{3}-\d{4}$/, "郵便番号の形式ではありません")
    expect(v("123-4567")).toBeNull()
    expect(v("1234567")).toBe("郵便番号の形式ではありません")
  })

  it("合成チェック（combine）は最初に失敗したバリデータのメッセージを返す", () => {
    const v = combine(hankaku(), pattern(/^\d+$/, "数値で入力してください"))
    expect(v("123")).toBeNull()
    expect(v("あいう")).toBe("半角で入力してください") // 1つ目で失敗
    expect(v("abc")).toBe("数値で入力してください") // 2つ目で失敗
  })

  it("メッセージは引数で差し替えられる", () => {
    expect(zenkaku("全角でお願いします")("Dev")).toBe("全角でお願いします")
  })
})
