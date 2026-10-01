import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { useStore } from "@/hooks/useStore"
import type { DialogEntry, DialogsController } from "@core"

export interface DialogHostProps {
  /** @core の createDialogs() で作ったもの (アプリで 1 つ作って使い回す)。 */
  dialogs: DialogsController
}

/**
 * createDialogs で開いた確認・お知らせ・入力のダイアログを描く (MUI)。アプリのどこか 1 か所に置く。
 * 開く・閉じる・送信中・エラーはすべてコア側が持ち、ここは stack を描くだけ。
 */
export function DialogHost({ dialogs }: DialogHostProps) {
  const { stack } = useStore(dialogs)
  return (
    <>
      {stack.map((d) => (
        <OneDialog key={d.id} entry={d} dialogs={dialogs} />
      ))}
    </>
  )
}

function OneDialog({ entry: d, dialogs }: { entry: DialogEntry; dialogs: DialogsController }) {
  const theme = useTheme()
  // 狭い画面では全画面にする (入力欄があるとき特に使いやすい)
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm")) && d.kind === "prompt"
  return (
    <Dialog
      open
      fullScreen={fullScreen}
      fullWidth
      maxWidth="xs"
      onClose={() => dialogs.dismiss(d.id)}
      aria-labelledby={`hc-dialog-${d.id}`}
    >
      <DialogTitle id={`hc-dialog-${d.id}`}>{d.title}</DialogTitle>
      <DialogContent>
        {d.message && (
          <DialogContentText sx={{ whiteSpace: "pre-wrap" }}>{d.message}</DialogContentText>
        )}
        {d.input && (
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={d.input.label}
            placeholder={d.input.placeholder}
            value={d.input.value}
            onChange={(e) => dialogs.setInput(d.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) void dialogs.accept(d.id)
            }}
            error={d.input.error !== null && d.input.value !== ""}
            helperText={d.input.value !== "" ? (d.input.error ?? " ") : " "}
            disabled={d.busy}
          />
        )}
        {d.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {d.error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {d.cancelLabel && (
          <Button onClick={() => dialogs.dismiss(d.id)} disabled={d.busy}>
            {d.cancelLabel}
          </Button>
        )}
        <Button
          variant="contained"
          color={d.danger ? "error" : "primary"}
          onClick={() => void dialogs.accept(d.id)}
          loading={d.busy}
          disabled={d.input?.error != null}
          autoFocus={!d.input}
        >
          {d.error ? "もう一度" : d.okLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
