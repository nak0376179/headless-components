import { memo, useEffect, useRef, useState, type ReactNode } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import { resolveTemplate, type DataTableColumn, type FetchPage, type Row } from "@/utils"
import { virtualWindow, type InfiniteListState } from "@/utils/draft"
import { useDataTable } from "@/hooks/useDataTable"
import { useInfiniteList } from "@/hooks/draft/useInfiniteList"

export interface InfiniteTableProps<T> {
  /** サーバーページネーションと同じ形 ({ limit, cursor, search } → { items, nextCursor, count? })。 */
  fetchPage: FetchPage<T>
  columns: DataTableColumn<T>[]
  getRowId?: (row: T, index: number) => string
  /** 1 回に取る件数。@default 100 */
  pageSize?: number
  /** 1 行の高さ (px)。行は全部この高さにそろえる (仮想スクロールの前提)。@default 40 */
  rowHeight?: number
  /** 表の高さ (px)。@default 480 */
  height?: number
  /** 下端まで残りこの行数になったら次を読む。@default 30 */
  prefetchRows?: number
  searchPlaceholder?: string
  /** 表の下の状態表示を差し替える。 */
  renderStatus?: (state: InfiniteListState<T>, rendered: number) => ReactNode
}

/**
 * スクロールで続きを読み込むテーブル (MUI)。見えている行だけを描く (仮想スクロール) ので、
 * 何万件読み込んでも DOM の行数は画面の分 + 少しに収まる。
 * 読み込みの状態は @/utils の createInfiniteList、描く範囲の計算は virtualWindow が持つ。
 */
export function InfiniteTable<T>({
  fetchPage,
  columns,
  getRowId,
  pageSize = 100,
  rowHeight = 40,
  height = 480,
  prefetchRows = 30,
  searchPlaceholder = "検索…",
  renderStatus,
}: InfiniteTableProps<T>) {
  const { state, controller } = useInfiniteList({ fetchPage, pageSize })
  // 並べ替えはサーバーの順のまま (manual)。行の組み立てと列の描画だけ TanStack Table を使う。
  const { table } = useDataTable({ data: state.items, columns, getRowId, manual: true })
  const rows = table.getRowModel().rows

  const scroller = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(height)
  const [query, setQuery] = useState("")

  // スクロールのたびに描き直さず、1 フレームに 1 回にまとめる
  const raf = useRef(0)
  const onScroll = () => {
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      setScrollTop(scroller.current?.scrollTop ?? 0)
    })
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewport(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const header = rowHeight + 1 // 固定した見出しの分
  const win = virtualWindow({
    scrollTop: Math.max(0, scrollTop - header),
    viewportHeight: viewport,
    rowHeight,
    count: rows.length,
  })

  // 下端が近づいたら (または中身が画面に満たなければ) 続きを読む
  const { loading, done, error } = state
  useEffect(() => {
    if (!loading && !done && !error && win.rowsBelow < prefetchRows) void controller.loadMore()
  }, [win.rowsBelow, loading, done, error, prefetchRows, controller])

  const leaf = table.getVisibleLeafColumns()
  const colSpan = leaf.length
  const rendered = win.end - win.start

  return (
    <Paper variant="outlined">
      <Box sx={{ p: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            controller.setSearch(e.target.value)
            scroller.current?.scrollTo({ top: 0 })
          }}
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
      <Box
        ref={scroller}
        onScroll={onScroll}
        sx={{ height, overflow: "auto", contain: "strict", borderTop: 1, borderColor: "divider" }}
      >
        <Table size="small" stickyHeader sx={{ tableLayout: "fixed" }}>
          <colgroup>
            {leaf.map((c) => (
              <col key={c.id} style={{ width: c.columnDef.meta?.width }} />
            ))}
          </colgroup>
          <TableHead>
            {table.getHeaderGroups().map((g) => (
              <TableRow key={g.id}>
                {g.headers.map((h) => (
                  <TableCell key={h.id} sx={{ height: rowHeight, py: 0, whiteSpace: "nowrap" }}>
                    {h.isPlaceholder
                      ? null
                      : (resolveTemplate(h.column.columnDef.header, h.getContext()) as ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {win.padTop > 0 && (
              <tr aria-hidden style={{ height: win.padTop }}>
                <td colSpan={colSpan} style={{ padding: 0, border: 0 }} />
              </tr>
            )}
            {rows.slice(win.start, win.end).map((row) => (
              <VirtualRow key={row.id} row={row} height={rowHeight} />
            ))}
            {win.padBottom > 0 && (
              <tr aria-hidden style={{ height: win.padBottom }}>
                <td colSpan={colSpan} style={{ padding: 0, border: 0 }} />
              </tr>
            )}
          </TableBody>
        </Table>
        {loading && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: "center", alignItems: "center", py: 2 }}
          >
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              読み込み中…
            </Typography>
          </Stack>
        )}
        {!loading && done && rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            該当するデータがありません
          </Typography>
        )}
      </Box>
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void controller.loadMore()}>
              再試行
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary">
          {renderStatus
            ? renderStatus(state, rendered)
            : `読み込み済み ${rows.length.toLocaleString()} 件${done ? " (すべて)" : ""} ・ 描いている行 ${rendered}`}
        </Typography>
      </Box>
    </Paper>
  )
}

// 行は中身が変わらない限り描き直さない (スクロールしても同じ行はそのまま)。
// TanStack の行オブジェクトは data が変わるまで同じものが返る。
const VirtualRow = memo(function VirtualRow<T>({ row, height }: { row: Row<T>; height: number }) {
  return (
    <TableRow hover sx={{ height }}>
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          sx={{ py: 0, height, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {resolveTemplate(cell.column.columnDef.cell, cell.getContext()) as ReactNode}
        </TableCell>
      ))}
    </TableRow>
  )
}) as <T>(props: { row: Row<T>; height: number }) => ReactNode
