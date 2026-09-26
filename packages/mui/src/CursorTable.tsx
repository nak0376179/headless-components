import { useImperativeHandle, useMemo, type Ref } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore"
import NavigateNextIcon from "@mui/icons-material/NavigateNext"
import type { CursorPagerController, CursorPagerState, DataTableColumn, FetchPage } from "@hc/core"
import { useCursorPager, useDataTable } from "@hc/react"
import { TableView } from "./DataTable"

export type CursorTableProps<T> = {
  /** 1 ページ分を返す API (カーソル方式)。 */
  fetchPage: FetchPage<T>
  columns: DataTableColumn<T>[]
  getRowId?: (row: T, index: number) => string
  pageSizeOptions?: number[]
  initialPageSize?: number
  searchPlaceholder?: string
  /** ページ下部の左側に出す文言。既定は「Nページ目 — 返却N件」。 */
  renderStatus?: (state: CursorPagerState<T>) => string
  /** reload() などを外から呼ぶため。 */
  controllerRef?: Ref<CursorPagerController<T>>
}

const defaultStatus = <T,>(s: CursorPagerState<T>) =>
  s.page
    ? `${s.pageIndex + 1}ページ目 — 返却${s.page.count ?? s.page.items.length}件${s.loading ? " · 更新中…" : ""}`
    : ""

/** カーソル方式のサーバーページネーション (MUI)。検索・件数変更は 1 ページ目からやり直す。 */
export function CursorTable<T>({
  fetchPage,
  columns,
  getRowId,
  pageSizeOptions = [5, 10, 25],
  initialPageSize = 10,
  searchPlaceholder = "検索…",
  renderStatus = defaultStatus,
  controllerRef,
}: CursorTableProps<T>) {
  const { state, controller } = useCursorPager({ fetchPage, pageSize: initialPageSize })
  useImperativeHandle(controllerRef, () => controller, [controller])
  // 毎回 [] を作ると setData → 再描画が止まらないので、ページが変わったときだけ作る。
  const items = useMemo(() => state.page?.items ?? [], [state.page])
  const { table } = useDataTable({ data: items, columns, getRowId, manual: true })

  if (state.error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void controller.reload()}>
            再試行
          </Button>
        }
      >
        <Box component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", fontSize: 13 }}>
          {state.error}
        </Box>
      </Alert>
    )
  }

  return (
    <Paper variant="outlined">
      <Stack direction="row" spacing={2} sx={{ p: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={searchPlaceholder}
          value={state.search}
          onChange={(e) => controller.setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={state.pageSize}
            onChange={(e) => controller.setPageSize(Number(e.target.value))}
          >
            {pageSizeOptions.map((n) => (
              <MenuItem key={n} value={n}>
                {n}件/ページ
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TableView table={table} loading={state.page ? null : <CircularProgress size={24} />} />

      <Stack
        direction="row"
        spacing={2}
        sx={{ p: 2, alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="body2" color="text.secondary">
          {renderStatus(state)}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<NavigateBeforeIcon />}
            onClick={controller.prev}
            disabled={!state.hasPrev || state.loading}
          >
            前へ
          </Button>
          <Button
            endIcon={<NavigateNextIcon />}
            onClick={controller.next}
            disabled={!state.hasNext || state.loading}
          >
            次へ
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
