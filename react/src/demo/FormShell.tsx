import type { ReactNode } from "react"
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material"
import type { FormController, FormState } from "@/utils/draft"

/** フォームのデモの共通枠: 見出し・本体・送信ボタン・いまの値 (JSON)・送信結果。 */
export function FormShell<T extends object>({
  title,
  description,
  form,
  state,
  saved,
  children,
}: {
  title: string
  description: string
  form: FormController<T>
  state: FormState<T>
  /** 送信できた値 (表示用)。 */
  saved: T | null
  children: ReactNode
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>
      <Box
        component="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit()
        }}
      >
        <Stack spacing={2.5}>{children}</Stack>
        {state.submitError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {state.submitError}
          </Alert>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" disabled={state.submitting}>
            {state.submitting ? "送信中…" : "送信"}
          </Button>
          <Button onClick={() => form.reset()} disabled={!state.dirty || state.submitting}>
            リセット
          </Button>
        </Stack>
      </Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 3 }}>
        <ValueBox label="いまの値" value={state.values} />
        <ValueBox label="送信した値" value={saved} />
      </Stack>
    </Paper>
  )
}

function ValueBox({ label, value }: { label: string; value: unknown }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          bgcolor: "action.hover",
          fontSize: 12,
          overflowX: "auto",
          minHeight: 48,
        }}
      >
        {value === null ? "—" : JSON.stringify(value, null, 2)}
      </Box>
    </Box>
  )
}

/** 送信を少し待たせる (送信中の表示を見せるため)。 */
export const fakeSave = () => new Promise((r) => setTimeout(r, 600))
