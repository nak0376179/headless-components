import { useEffect, useState } from "react"
import { Chip, Stack, Typography } from "@mui/material"
import { InfiniteTable } from "@hc/mui"
import { useController } from "@hc/react"
import { createLargeEmployeeSource, type Employee } from "@hc/demo-data"
import type { DataTableColumn } from "@hc/core"
import { employeeColumns } from "./employeeColumns"

const TOTAL = 10000

// 幅を固定しておくと、スクロールで中身が入れ替わっても列がガタつかない (meta.width)
const WIDTHS: Record<string, number | string> = {
  email: "26%",
  name: 130,
  department: 150,
  role: 120,
  status: 100,
  joinedAt: 120,
  salary: 130,
}
const columns: DataTableColumn<Employee>[] = employeeColumns.map((c) => ({
  ...c,
  meta: { ...c.meta, width: WIDTHS[(c as { accessorKey?: string }).accessorKey ?? ""] },
}))

/** 1 万件を 100 件ずつ読み込みながらスクロールする。描くのは見えている行だけ。 */
export function InfiniteScrollDemo() {
  const source = useController(() => createLargeEmployeeSource(TOTAL, 300))
  const fps = useFps()
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        下までスクロールすると次の 100 件を読む (残り 30
        行で先読みするので、普通の速さなら待たない)。 見えている行 ± 8
        行だけを描く仮想スクロールなので、何千件読み込んでも DOM の行は数十行のまま。
        検索はサーバー側 (模擬 API) で行い、最初から読み直す。
      </Typography>
      <Stack direction="row" spacing={1}>
        <Chip size="small" label={`全 ${TOTAL.toLocaleString()} 件`} />
        <Chip size="small" label="1 回 100 件 / 応答 300ms" />
        <Chip
          size="small"
          color={fps >= 50 ? "success" : fps >= 30 ? "warning" : "error"}
          label={`滑らかさ ${fps} fps`}
        />
      </Stack>
      <InfiniteTable
        fetchPage={source.fetchPage}
        columns={columns}
        getRowId={(e) => e.email}
        pageSize={100}
        rowHeight={40}
        height={520}
        searchPlaceholder="氏名・部署・役職で検索…（サーバー側で絞り込み）"
      />
    </Stack>
  )
}

/** 画面の書き換えの速さ (1 秒ごとに数える)。 */
function useFps() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      frames++
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}
