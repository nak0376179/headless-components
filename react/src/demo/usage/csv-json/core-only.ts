import { convertDelimitedText, type ColumnSpec } from "@core"

// UI なしで変換だけ (サーバーへ送る前の検査・テストなど)。区切りは CSV / TSV を自動判定する。
const columns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required", maxLength: 20 },
  { label: "メールアドレス", key: "email", usage: "required" },
]

const tsv = ["氏名\tメールアドレス", "山田 太郎\tyamada@example.com"].join("\n")
const result = convertDelimitedText(tsv, columns, "json")

if (result.ok) {
  console.log(result.rows) // [{ name: "山田 太郎", email: "yamada@example.com" }]
  console.log(result.output) // 整形済みの JSON 文字列 (format に "csv" / "tsv" も指定できる)
} else {
  for (const e of result.errors) console.log(e.row, e.label, e.message)
}
