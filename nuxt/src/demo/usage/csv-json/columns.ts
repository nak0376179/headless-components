import { combine, email, numeric, oneOf, pattern, zenkakuKatakana, type ColumnSpec } from "@/utils"

// 列定義は UI に依らない (React でも Vue でも同じ物を渡す)。
// label = 貼り付けるデータのヘッダ (日本語の項目名) / key = 変換後の JSON のキー。
// 列の並び順は自由。ヘッダとセルの前後の空白 (全角スペースも) は自動で取り除く。
export const columns: ColumnSpec[] = [
  // 必須・20 文字以内 (文字数はコードポイントで数える)
  { label: "氏名", key: "name", usage: "required", maxLength: 20 },
  // 省略可。値があるときだけ検査する
  { label: "フリガナ", key: "kana", usage: "optional", validate: zenkakuKatakana() },
  { label: "メールアドレス", key: "email", usage: "required", maxLength: 100, validate: email() },
  { label: "年齢", key: "age", usage: "optional", validate: numeric() },
  // 候補のどれか
  {
    label: "雇用形態",
    key: "employment",
    usage: "optional",
    validate: oneOf(["正社員", "契約", "派遣"]),
  },
  // 複数の検査を順に当て、最初に引っかかった理由を出す
  {
    label: "社員番号",
    key: "code",
    usage: "required",
    validate: combine(numeric(), pattern(/^\d{6}$/, "6 桁の数字で入力してください")),
  },
  // 入力にあっても出力から項目ごと消す
  { label: "メモ", key: "memo", usage: "unused" },
]
