import type { ReactNode } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import {
  paginationSummary,
  PAGE_SIZE_OPTIONS,
  resolveTemplate,
  type DataTableColumn,
  type Table as HeadlessTable,
} from "@/utils"
import { useDataTable } from "@/hooks/useDataTable"

export type DataTableProps<T> = {
  data: T[]
  columns: DataTableColumn<T>[]
  initialPageSize?: number
  searchPlaceholder?: string
  getRowId?: (row: T, index: number) => string
  /** 取得中 (TanStack Query の isFetching など)。データがまだ無ければ表の中に、あれば上端に出す。 */
  loading?: boolean
  /** 取得の失敗 (表の上に出す)。 */
  error?: string | null
  /** 「再試行」を押したとき (refetch など)。渡さなければボタンを出さない。 */
  onRetry?: () => void
}

/** @/utils の createDataTable (TanStack Table) を MUI で描く汎用データテーブル。 */
export function DataTable<T>({
  data,
  columns,
  initialPageSize = 10,
  searchPlaceholder = "検索…",
  getRowId,
  loading = false,
  error = null,
  onRetry,
}: DataTableProps<T>) {
  const { table, state } = useDataTable({ data, columns, initialPageSize, getRowId })
  const summary = paginationSummary(table)

  return (
    <Paper variant="outlined" sx={{ position: "relative", overflow: "hidden" }}>
      {loading && data.length > 0 && (
        <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0 }} />
      )}
      {error && (
        <Alert
          severity="error"
          sx={{ m: 2, mb: 0 }}
          action={
            onRetry && (
              <Button color="inherit" size="small" onClick={onRetry}>
                再試行
              </Button>
            )
          }
        >
          {error}
        </Alert>
      )}
      <Box sx={{ p: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={searchPlaceholder}
          value={state.state.globalFilter ?? ""}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
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
      </Box>
      <TableView
        table={table}
        loading={loading && data.length === 0 ? <CircularProgress size={28} /> : undefined}
      />
      <TablePagination
        component="div"
        count={summary.total}
        page={summary.pageIndex}
        onPageChange={(_, page) => table.setPageIndex(page)}
        rowsPerPage={summary.pageSize}
        onRowsPerPageChange={(e) => table.setPageSize(Number(e.target.value))}
        rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        labelRowsPerPage="表示件数:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}件`}
      />
    </Paper>
  )
}

/** ヘッダ (並べ替えつき) と行を描く。DataTable と CursorTable で共用。 */
export function TableView<T>({
  table,
  loading,
  empty = "該当するデータがありません",
}: {
  table: HeadlessTable<T>
  loading?: ReactNode
  empty?: ReactNode
}) {
  const rows = table.getRowModel().rows
  const colSpan = table.getVisibleLeafColumns().length
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const label = header.isPlaceholder
                  ? null
                  : (resolveTemplate(
                      header.column.columnDef.header,
                      header.getContext(),
                    ) as ReactNode)
                const sorted = header.column.getIsSorted()
                return (
                  <TableCell key={header.id} sortDirection={sorted}>
                    {header.column.getCanSort() ? (
                      <TableSortLabel
                        active={!!sorted}
                        direction={sorted || "asc"}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {label}
                      </TableSortLabel>
                    ) : (
                      label
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
                {loading}
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} align="center" sx={{ py: 4, color: "text.secondary" }}>
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} hover>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {resolveTemplate(cell.column.columnDef.cell, cell.getContext()) as ReactNode}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
