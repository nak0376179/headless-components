import { useMemo } from "react"
import { DataTable } from "@/components/DataTable"
import { columns, type Employee } from "./columns"

// 全件を渡すと、並べ替え・フリーワード検索・ページングを手元で行う。
// 検索は空白区切りの AND (「営業 在籍」)。全角/半角・ひらがな/カタカナの違いは無視する。
export function Employees({ items }: { items: Employee[] }) {
  // ⚠ data は描画のたびに新しい配列にしない (useMemo で包む)。作り直すと再描画が止まらない
  const data = useMemo(() => items.filter((e) => e.status !== "retired"), [items])
  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(e) => e.email}
      initialPageSize={25}
      searchPlaceholder="フリーワード検索 (空白で区切ると AND)"
    />
  )
}
