// README.md の「できること」に載せた例が、そのとおりに動くことを確かめる。
// README を直したらこのテストも直す (説明と挙動がずれないように)。
import { describe, expect, it } from "vitest"
import { convertDelimitedText, MAX_ERRORS, type ColumnSpec } from "./convert"
import { combine, email, hankaku, numeric, pattern } from "./validators"

// README の例で使う列定義
const columns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required", maxLength: 10 },
  { label: "メールアドレス", key: "email", usage: "required", validate: email() },
  { label: "年齢", key: "age", usage: "optional", validate: numeric() },
  {
    label: "郵便番号",
    key: "zip",
    usage: "optional",
    validate: combine(hankaku(), pattern(/^\d{3}-\d{4}$/, "123-4567 の形で入力してください")),
  },
  { label: "メモ", key: "memo", usage: "unused" },
]

const run = (...lines: string[]) => convertDelimitedText(lines.join("\n"), columns)
const messages = (r: ReturnType<typeof run>) => (r.ok ? [] : r.errors.map((e) => e.message))

describe("README の「できること」", () => {
  it("1. 列の並びは自由・任意の列は無くてよい・出力のキーは列定義の順", () => {
    const r = run("メールアドレス,氏名", "taro@example.com,山田太郎")
    expect(r.ok && r.rows).toEqual([
      { name: "山田太郎", email: "taro@example.com", age: "", zip: "" },
    ])
  })

  it("2. 前後の空白 (全角スペースも) を取り除き、途中の空白は残す", () => {
    const r = run(" 氏名 ,メールアドレス", "　山田 太郎　, taro@example.com ")
    expect(r.ok && r.rows[0]).toMatchObject({ name: "山田 太郎", email: "taro@example.com" })
  })

  it("3. 必須の列はヘッダに必要で、値も空にできない", () => {
    expect(messages(run("メールアドレス", "taro@example.com"))).toEqual([
      "ヘッダ: 必須項目「氏名」がありません",
    ])
    expect(messages(run("氏名,メールアドレス", "　,taro@example.com"))).toEqual([
      "2行目: 「氏名」は必須です",
    ])
  })

  it("3. 任意の列は空でよく、不要の列は出力から消える", () => {
    const r = run("氏名,メールアドレス,年齢,メモ", "山田太郎,taro@example.com,,社内向け")
    expect(r.ok && r.rows).toEqual([
      { name: "山田太郎", email: "taro@example.com", age: "", zip: "" },
    ])
  })

  it("4. 文字数と検査を重ねられ、combine で複数の検査を順に当てる (最初に引っかかった理由を返す)", () => {
    expect(
      messages(
        run(
          "氏名,メールアドレス,郵便番号",
          "山田太郎山田太郎山田太郎,taro@example.com,", // 12 文字 > 10
          "山田太郎,taro@example.com,１２３-４５６７", // 全角 → hankaku で止まる
          "山田太郎,taro@example.com,1234567", // 半角だが形が違う → pattern で止まる
        ),
      ),
    ).toEqual([
      "2行目: 「氏名」は10文字以内で入力してください（現在12文字）",
      "3行目: 「郵便番号」が不正です（半角で入力してください）",
      "4行目: 「郵便番号」が不正です（123-4567 の形で入力してください）",
    ])
  })

  it("5. 1 行の中の複数列のエラーを列ごとに返す (1 セルにつき 1 件)", () => {
    expect(messages(run("氏名,メールアドレス,年齢", ",taro,三十"))).toEqual([
      "2行目: 「氏名」は必須です",
      "2行目: 「メールアドレス」が不正です（メールアドレスの形式ではありません）",
      "2行目: 「年齢」が不正です（数値で入力してください）",
    ])
  })

  it("5. エラーは全体で最大 10 件まで (行・列をまたいで数える)", () => {
    const rows = Array.from({ length: 5 }, () => ",taro,三十") // 1 行 3 件 × 5 行 = 15 件
    const r = run("氏名,メールアドレス,年齢", ...rows)
    expect(MAX_ERRORS).toBe(10)
    expect(r.ok ? 0 : r.errors.length).toBe(10)
  })

  it("5. ヘッダに誤りがあれば、データ行は検査しない", () => {
    expect(messages(run("氏名,メールアドレス,住所", ",taro,東京"))).toEqual([
      "ヘッダ: 「住所」は定義されていない項目です",
    ])
  })
})
