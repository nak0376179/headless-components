import { useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button, FormControlLabel, Stack, Switch, Typography } from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import { fetchAllPages } from "@/utils"
import { DataTable } from "@/components/DataTable"
import { useController } from "@/hooks/useStore"
import { createLargeEmployeeSource, type Employee } from "@demo-data"
import { employeeColumns } from "@/demo/employeeColumns"

const TOTAL = 1000
const EMPTY: Employee[] = [] // 取得前も同じ配列を渡す (毎回 [] を作ると表が作り直しを繰り返す)

/**
 * 全件を TanStack Query (useQuery) で取り、並べ替え・フリーワード検索・ページングは
 * 手元 (TanStack Table) で行う。取得結果はキャッシュされ、別のページへ行って戻っても取り直さない。
 */
export default function DataTablePage() {
  const source = useController(() => createLargeEmployeeSource(TOTAL, 200))
  const fail = useRef(false) // 「取得を失敗させる」(エラー表示の確認用)
  const query = useQuery({
    queryKey: ["employees", TOTAL],
    queryFn: () => {
      if (fail.current) throw new Error("取得に失敗しました (模擬)")
      return fetchAllPages(source.fetchPage, 250)
    },
  })
  const updated = query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString() : "—"

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {TOTAL.toLocaleString()} 件を API から 250 件ずつ取りまとめ (fetchAllPages)、useQuery
        でキャッシュする。検索は空白区切りの AND (「営業 在籍」)
        で、全角/半角・ひらがな/カタカナの違いを無視し、画面の文字 (「在籍」「¥5,200,000」)
        でも当たる。
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          再読み込み
        </Button>
        <FormControlLabel
          control={<Switch size="small" onChange={(e) => (fail.current = e.target.checked)} />}
          label="取得を失敗させる"
        />
        <Typography variant="body2" color="text.secondary">
          最終取得 {updated}
          {query.isFetching && " · 取得中…"}
        </Typography>
      </Stack>
      <DataTable
        data={query.data ?? EMPTY}
        columns={employeeColumns}
        getRowId={(e) => e.email}
        initialPageSize={25}
        searchPlaceholder="フリーワード検索 (空白で区切ると AND)"
        loading={query.isFetching}
        error={query.error?.message}
        onRetry={() => void query.refetch()}
      />
    </Stack>
  )
}
