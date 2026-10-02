import { Stack, Typography } from "@mui/material"
import { CursorTable } from "@/components/draft/CursorTable"
import { useController } from "@/hooks/useStore"
import { createEmployeeSource } from "@demo-data"
import { employeeColumns } from "@/demo/employeeColumns"

/** 1 ページずつ API に取りに行く (カーソル方式)。検索もサーバー側で行う。 */
export default function ServerPaginationPage() {
  const source = useController(() => createEmployeeSource(400))
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        「次へ」で nextCursor
        を渡して次のページを取りに行き、「前へ」は訪れたページのカーソルを積んでおいて戻る (DynamoDB
        の LastEvaluatedKey と同じ方式)。応答は 400ms 遅らせてある。読んだページは TanStack Query
        がキャッシュするので、「前へ」・一度見たページ・前の検索語は待たずに出る。
      </Typography>
      <CursorTable
        fetchPage={source.fetchPage}
        columns={employeeColumns}
        getRowId={(e) => e.email}
        searchPlaceholder="氏名・部署・役職で検索…（サーバー側で絞り込み）"
      />
    </Stack>
  )
}
