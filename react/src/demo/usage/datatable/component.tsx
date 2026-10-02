import { useQuery } from "@tanstack/react-query"
import { fetchAllPages, type CursorPage, type PageRequest } from "@/utils"
import { DataTable } from "@/components/DataTable"
import { columns, type Employee } from "./columns"

// API が 1 ページずつ (カーソル方式) 返すなら fetchAllPages で全件にまとめる。
// 1 回で全件返す API なら、queryFn で fetch した配列をそのまま返せばよい。
async function fetchEmployees({ limit, cursor }: PageRequest): Promise<CursorPage<Employee>> {
  const q = new URLSearchParams({ limit: String(limit), ...(cursor ? { cursor } : {}) })
  const res = await fetch(`/api/employees?${q}`)
  if (!res.ok) throw new Error(`取得に失敗しました (${res.status})`) // 表の上に「再試行」つきで出る
  return res.json()
}

const EMPTY: Employee[] = [] // ⚠ 取得前も同じ配列を渡す (毎回 [] を作ると表が作り直しを繰り返す)

// 取得とキャッシュは TanStack Query、並べ替え・フリーワード検索・ページングは手元 (TanStack Table)。
// 検索は空白区切りの AND (「営業 在籍」)。全角/半角・ひらがな/カタカナの違いは無視する。
export function Employees() {
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetchAllPages(fetchEmployees, 250),
  })
  return (
    <DataTable
      data={data ?? EMPTY}
      columns={columns}
      getRowId={(e) => e.email}
      initialPageSize={25}
      searchPlaceholder="フリーワード検索 (空白で区切ると AND)"
      loading={isFetching}
      error={error?.message}
      onRetry={() => void refetch()}
    />
  )
}
