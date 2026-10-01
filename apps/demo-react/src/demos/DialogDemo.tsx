import { useState } from "react"
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { createDialogs, email, required, whenFilled } from "@hc/core"
import { DialogHost } from "@hc/mui"
import { useForm } from "@hc/react"

// アプリで 1 つ作って使い回す (普通はアプリの一番外側に <DialogHost dialogs={dialogs} /> を置く)。
const dialogs = createDialogs()
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function DialogDemo() {
  const [log, setLog] = useState<string[]>([])
  const note = (s: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${s}`, ...l].slice(0, 8))
  const [formOpen, setFormOpen] = useState(false)

  const samples: { title: string; body: string; run: () => Promise<void> }[] = [
    {
      title: "🗑️ 削除の確認",
      body: "危ない操作は赤いボタンにする。結果は true / false で返る。",
      run: async () => {
        const ok = await dialogs.confirm({
          title: "「2026年度 予算.xlsx」を削除しますか？",
          message: "ゴミ箱には入りません。この操作は元に戻せません。",
          danger: true,
        })
        note(`削除の確認 → ${ok}`)
      },
    },
    {
      title: "⏳ 送信してから閉じる",
      body: "OK を押すと送信中になり、終わるまで閉じない。1 回目はわざと失敗させるので「もう一度」を押す。",
      run: async () => {
        let tries = 0
        const ok = await dialogs.confirm({
          title: "申請を送信しますか？",
          message: "上長に承認依頼のメールが届きます。",
          okLabel: "送信",
          onConfirm: async () => {
            await wait(900)
            if (++tries === 1) throw new Error("通信に失敗しました。もう一度お試しください。")
          },
        })
        note(`送信 → ${ok} (${tries} 回目で成功)`)
      },
    },
    {
      title: "✏️ 名前を入力",
      body: "入力の検査が通るまで OK を押せない。Enter でも決定できる (変換中の Enter は無視)。",
      run: async () => {
        const name = await dialogs.prompt({
          title: "新しいフォルダ",
          label: "フォルダ名",
          defaultValue: "無題のフォルダ",
          validate: (v) =>
            !v.trim()
              ? "入力してください"
              : /[\\/:*?"<>|]/.test(v)
                ? "使えない文字があります"
                : null,
        })
        note(`フォルダ名 → ${JSON.stringify(name)}`)
      },
    },
    {
      title: "🔁 続けて聞く",
      body: "await を並べるだけで、確認 → 入力 → お知らせの流れを書ける。",
      run: async () => {
        if (!(await dialogs.confirm({ title: "招待を送りますか？" }))) return note("招待 → やめた")
        const mail = await dialogs.prompt({
          title: "招待する人",
          label: "メールアドレス",
          placeholder: "taro@example.com",
          validate: (v) => required()(v) ?? whenFilled(email())(v),
        })
        if (mail === null) return note("招待 → 入力でやめた")
        await dialogs.alert({ title: "送りました", message: `${mail} に招待メールを送りました。` })
        note(`招待 → ${mail}`)
      },
    },
    {
      title: "🪟 上に重ねる",
      body: "ダイアログの中から別のダイアログを開ける (後から開いた方が手前)。",
      run: async () => {
        const p = dialogs.confirm({
          title: "編集中の内容があります",
          message: "保存せずに閉じますか？",
          okLabel: "閉じる",
        })
        await wait(400)
        await dialogs.alert({ title: "ℹ️ ヒント", message: "下のダイアログはまだ開いています。" })
        note(`重ねる → ${await p}`)
      },
    },
  ]

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        確認・入力・お知らせを <code>await dialogs.confirm(...)</code> のように Promise
        で開く。開く・閉じる・ 送信中・エラーはコア (createDialogs) が持ち、MUI は DialogHost
        が描くだけ。
      </Typography>
      <Grid container spacing={2}>
        {samples.map((s) => (
          <Grid key={s.title} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              variant="outlined"
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {s.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.body}
                </Typography>
              </CardContent>
              <CardActions>
                <Button onClick={() => void s.run()}>開く</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            variant="outlined"
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                📝 フォームのダイアログ
              </Typography>
              <Typography variant="body2" color="text.secondary">
                中身を自由に作るときは MUI の Dialog に useForm を組み合わせる。
              </Typography>
            </CardContent>
            <CardActions>
              <Button onClick={() => setFormOpen(true)}>開く</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Paper variant="outlined">
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 2, pt: 1, display: "block" }}
        >
          返ってきた値
        </Typography>
        <List dense>
          {log.length === 0 && (
            <ListItem>
              <ListItemText secondary="まだありません" />
            </ListItem>
          )}
          {log.map((l, i) => (
            <ListItem key={i}>
              <ListItemText
                primary={l}
                slotProps={{ primary: { sx: { fontFamily: "monospace" } } }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <ContactDialog
        open={formOpen}
        onClose={(sent) => {
          setFormOpen(false)
          if (sent) note(`問い合わせ → ${sent}`)
        }}
      />
      <DialogHost dialogs={dialogs} />
    </Stack>
  )
}

/** 中身を自由に作るダイアログ (フォーム入り)。閉じるときに送った件名を返す。 */
function ContactDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: (sent: string | null) => void
}) {
  const { state, controller: form } = useForm({
    initial: { subject: "", body: "" },
    rules: {
      subject: required("件名を入力してください"),
      body: required("本文を入力してください"),
    },
    onSubmit: async (v) => {
      await wait(700)
      onClose(v.subject)
      form.reset()
    },
  })
  const close = async () => {
    // 書きかけなら確かめてから閉じる (自作のダイアログからも createDialogs を使える)
    if (
      state.dirty &&
      !(await dialogs.confirm({
        title: "書きかけの内容を捨てますか？",
        okLabel: "捨てる",
        danger: true,
      }))
    )
      return
    form.reset()
    onClose(null)
  }
  return (
    <Dialog open={open} onClose={() => void close()} fullWidth maxWidth="sm">
      <DialogTitle>お問い合わせ</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {state.submitError && <Alert severity="error">{state.submitError}</Alert>}
          <TextField
            label="件名"
            value={state.values.subject}
            onChange={(e) => form.setValue("subject", e.target.value)}
            onBlur={() => form.touch("subject")}
            error={form.fieldError("subject") !== null}
            helperText={form.fieldError("subject") ?? " "}
          />
          <TextField
            label="本文"
            multiline
            minRows={4}
            value={state.values.body}
            onChange={(e) => form.setValue("body", e.target.value)}
            onBlur={() => form.touch("body")}
            error={form.fieldError("body") !== null}
            helperText={form.fieldError("body") ?? " "}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => void close()} disabled={state.submitting}>
          キャンセル
        </Button>
        <Button variant="contained" loading={state.submitting} onClick={() => void form.submit()}>
          送信
        </Button>
      </DialogActions>
    </Dialog>
  )
}
