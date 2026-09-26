import { useMemo } from "react"
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import { DataTable } from "@hc/mui"
import { useController, useStore } from "@hc/react"
import {
  createEmployeeDirectory,
  createEmployeeSource,
  DEPARTMENTS,
  EMPLOYEE_HEADERS as H,
  ROLES,
  STATUS_LABEL,
  type Status,
} from "@hc/demo-data"
import { employeeColumnHelper, employeeColumns } from "./employeeColumns"

/**
 * 全件を分割取得して表に出し、追加・編集・削除する。
 * 画面の状態 (読み込み・ダイアログ・送信中・エラー) は @hc/demo-data の createEmployeeDirectory が持つ。
 */
export function EmployeesDemo() {
  const dir = useController(() => createEmployeeDirectory(createEmployeeSource()))
  const { items, loading, error, form, deleting } = useStore(dir)

  const columns = useMemo(
    () => [
      ...employeeColumns,
      employeeColumnHelper.display({
        id: "actions",
        header: "操作",
        cell: (info) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="編集">
              <IconButton size="small" onClick={() => dir.openEdit(info.row.original)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="削除">
              <IconButton size="small" onClick={() => dir.askDelete(info.row.original)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      }),
    ],
    [dir],
  )

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void dir.reload()}>
            再試行
          </Button>
        }
      >
        {error}
      </Alert>
    )
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" color="text.secondary">
          ブラウザ内の模擬 API から 25 件ずつ全件を取得して、並べ替え・検索・ページングは手元で行う
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void dir.reload()}
            disabled={loading}
          >
            再取得
          </Button>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={dir.openCreate}>
            追加
          </Button>
        </Stack>
      </Stack>

      {loading && items.length === 0 ? (
        <Stack sx={{ py: 8, alignItems: "center" }}>
          <CircularProgress />
        </Stack>
      ) : (
        <DataTable
          data={items}
          columns={columns}
          getRowId={(e) => e.email}
          searchPlaceholder="氏名・部署・役職で検索…"
        />
      )}

      <Dialog open={form !== null} onClose={dir.closeForm} fullWidth maxWidth="sm">
        {form && (
          <>
            <DialogTitle>{form.mode === "create" ? "従業員を追加" : "従業員を編集"}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {form.error && <Alert severity="error">{form.error}</Alert>}
                <TextField
                  label={H.email}
                  type="email"
                  value={form.value.email}
                  onChange={(e) => dir.updateForm({ email: e.target.value })}
                  disabled={form.mode === "edit"}
                  helperText={
                    form.mode === "edit" ? "メールアドレスは識別子のため変更できません" : undefined
                  }
                  required
                />
                <TextField
                  label={H.name}
                  value={form.value.name}
                  onChange={(e) => dir.updateForm({ name: e.target.value })}
                  required
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    fullWidth
                    label={H.department}
                    value={form.value.department}
                    onChange={(e) => dir.updateForm({ department: e.target.value })}
                  >
                    {DEPARTMENTS.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label={H.role}
                    value={form.value.role}
                    onChange={(e) => dir.updateForm({ role: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    fullWidth
                    label={H.status}
                    value={form.value.status}
                    onChange={(e) => dir.updateForm({ status: e.target.value as Status })}
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <MenuItem key={v} value={v}>
                        {l}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    type="date"
                    label={H.joinedAt}
                    value={form.value.joinedAt}
                    onChange={(e) => dir.updateForm({ joinedAt: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label={H.salary}
                    value={form.value.salary}
                    onChange={(e) => dir.updateForm({ salary: Number(e.target.value) })}
                  />
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={dir.closeForm} disabled={form.submitting}>
                キャンセル
              </Button>
              <Button
                variant="contained"
                onClick={() => void dir.submitForm()}
                disabled={form.submitting}
              >
                {form.mode === "create" ? "追加" : "保存"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={deleting !== null} onClose={dir.cancelDelete}>
        <DialogTitle>従業員を削除しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleting?.employee.name}（{deleting?.employee.email}
            ）を削除します。この操作は元に戻せません。
          </DialogContentText>
          {deleting?.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleting.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={dir.cancelDelete} disabled={deleting?.submitting}>
            キャンセル
          </Button>
          <Button
            onClick={() => void dir.confirmDelete()}
            color="error"
            disabled={deleting?.submitting}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
