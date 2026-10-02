import { Fragment, useMemo, useState, type ReactNode } from "react"
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import DeleteIcon from "@mui/icons-material/Delete"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import { paginationSummary, resolveTemplate, PAGE_SIZE_OPTIONS } from "@/utils"
import { createDialogs } from "@/utils/draft"
import { DialogHost } from "@/components/draft/DialogHost"
import { useDataTable } from "@/hooks/useDataTable"
import { formatSalary, generateEmployees, type Employee } from "@demo-data"
import { employeeColumns, StatusChip } from "@/demo/employeeColumns"

const dialogs = createDialogs()

/**
 * useDataTable (TanStack Table) で、選択・展開・並べ替え・検索・ページングを組む。
 * 見た目は MUI の Table を自分で並べる (完成品の DataTable では足りないとき用)。
 */
export default function TableBasicsPage() {
  const [items, setItems] = useState(() => generateEmployees(120))
  const [dense, setDense] = useState(true)
  const { table, state } = useDataTable({
    data: items,
    columns: employeeColumns,
    getRowId: (e) => e.email,
    initialPageSize: 10,
    enableRowSelection: (row) => row.original.status !== "retired", // 退職者は選べない
    getRowCanExpand: () => true,
  })
  const selected = Object.keys(state.state.rowSelection ?? {})
  const summary = paginationSummary(table)
  const colSpan = table.getVisibleLeafColumns().length + 2

  const removeSelected = async () => {
    const ok = await dialogs.confirm({
      title: `${selected.length} 人を削除しますか？`,
      message: "選んだ行をまとめて削除します。",
      danger: true,
    })
    if (!ok) return
    const gone = new Set(selected)
    setItems((list) => list.filter((e) => !gone.has(e.email)))
    table.resetRowSelection()
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        行の選択
        (全選択・一部だけ選んだときの中間表示・退職者は選べない)、行を開いて詳細、見出しの固定、
        並べ替え、フリーワード検索、ページング。状態はすべて useDataTable が持つ。
      </Typography>
      <Paper variant="outlined">
        {selected.length > 0 ? (
          <Toolbar sx={{ bgcolor: "primary.main", color: "primary.contrastText", gap: 2 }}>
            <Typography sx={{ flex: 1 }}>{selected.length} 件選択中</Typography>
            <Button color="inherit" onClick={() => table.resetRowSelection()}>
              選択を外す
            </Button>
            <Button
              color="inherit"
              startIcon={<DeleteIcon />}
              onClick={() => void removeSelected()}
            >
              削除
            </Button>
          </Toolbar>
        ) : (
          <Toolbar sx={{ gap: 2 }}>
            <TextField
              size="small"
              placeholder="フリーワード検索"
              value={state.state.globalFilter ?? ""}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              sx={{ flex: 1 }}
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
            <FormControlLabel
              control={<Switch checked={dense} onChange={(e) => setDense(e.target.checked)} />}
              label="詰めて表示"
            />
          </Toolbar>
        )}
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size={dense ? "small" : "medium"} stickyHeader>
            <TableHead>
              {table.getHeaderGroups().map((g) => (
                <TableRow key={g.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={table.getIsAllRowsSelected()}
                      indeterminate={table.getIsSomeRowsSelected()}
                      onChange={table.getToggleAllRowsSelectedHandler()}
                      slotProps={{ input: { "aria-label": "すべて選ぶ" } }}
                    />
                  </TableCell>
                  <TableCell padding="checkbox" />
                  {g.headers.map((h) => {
                    const sorted = h.column.getIsSorted()
                    return (
                      <TableCell key={h.id} sortDirection={sorted}>
                        <TableSortLabel
                          active={!!sorted}
                          direction={sorted || "asc"}
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {resolveTemplate(h.column.columnDef.header, h.getContext()) as ReactNode}
                        </TableSortLabel>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow hover selected={row.getIsSelected()}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                      />
                    </TableCell>
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        onClick={row.getToggleExpandedHandler()}
                        aria-label="詳細"
                      >
                        <KeyboardArrowDownIcon
                          sx={{
                            transform: row.getIsExpanded() ? "rotate(180deg)" : "none",
                            transition: "transform .2s",
                          }}
                        />
                      </IconButton>
                    </TableCell>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {
                          resolveTemplate(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          ) as ReactNode
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell
                      colSpan={colSpan}
                      sx={{ py: 0, borderBottom: row.getIsExpanded() ? undefined : 0 }}
                    >
                      <Collapse in={row.getIsExpanded()} unmountOnExit>
                        <Detail employee={row.original} />
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={summary.total}
          page={summary.pageIndex}
          onPageChange={(_, p) => table.setPageIndex(p)}
          rowsPerPage={summary.pageSize}
          onRowsPerPageChange={(e) => table.setPageSize(Number(e.target.value))}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          labelRowsPerPage="表示件数:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}件`}
        />
      </Paper>
      <DialogHost dialogs={dialogs} />
    </Stack>
  )
}

function Detail({ employee: e }: { employee: Employee }) {
  const years = useMemo(
    () => new Date().getFullYear() - Number(e.joinedAt.slice(0, 4)),
    [e.joinedAt],
  )
  return (
    <Box
      sx={{
        py: 2,
        px: 1,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 2,
      }}
    >
      {[
        ["メール", e.email],
        ["勤続", `${years} 年`],
        ["年収", formatSalary(e.salary)],
        ["月給 (目安)", formatSalary(Math.round(e.salary / 12 / 1000) * 1000)],
      ].map(([k, v]) => (
        <div key={k}>
          <Typography variant="caption" color="text.secondary">
            {k}
          </Typography>
          <Typography variant="body2">{v}</Typography>
        </div>
      ))}
      <div>
        <Typography variant="caption" color="text.secondary">
          状態
        </Typography>
        <div>
          <StatusChip status={e.status} />
        </div>
      </div>
    </Box>
  )
}
