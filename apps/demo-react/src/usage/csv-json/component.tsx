import { CsvJsonTextArea } from "@hc/mui"
import { columns } from "./columns"

// 貼り付け欄・形式の切り替え・変換ボタン・エラー表示・結果のコピーまで入った完成品。
export function ImportPage() {
  return (
    <CsvJsonTextArea
      columns={columns}
      rows={10}
      defaultFormat="json" // "json" | "csv" | "tsv"
      onConvert={(result) => {
        if (result.ok) {
          // [{ name: "山田 太郎", kana: "ヤマダタロウ", email: "…", … }] (キーは列定義の順)
          console.log(result.rows, result.output)
        } else {
          // [{ row: 3, label: "メールアドレス", message: "3行目「メールアドレス」: …" }] (最大 10 件)
          console.warn(result.errors)
        }
      }}
    />
  )
}
