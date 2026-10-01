import { TextField, Button } from "@mui/material"
import { email, maxChars, required, whenFilled } from "@core"
import { useForm } from "@/hooks/useForm"

type Values = { name: string; email: string }

// 値・検査・触れたか・送信中はフックが持つ。MUI の部品には値と変更・blur・エラーを渡すだけ。
export function SignupForm() {
  const { state, controller: form } = useForm<Values>({
    initial: { name: "", email: "" },
    rules: {
      name: [required("氏名を入力してください"), maxChars(20)], // 配列は順に当て、最初のエラーを出す
      email: [required(), whenFilled(email())], // CSV 変換の検査 (email など) をそのまま使える
    },
    onSubmit: async (values) => {
      await fetch("/api/signup", { method: "POST", body: JSON.stringify(values) })
      // 投げた例外は state.submitError に入る
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void form.submit() // 検査に通れば onSubmit を呼ぶ
      }}
    >
      <TextField
        label="氏名"
        value={state.values.name}
        onChange={(e) => form.setValue("name", e.target.value)}
        onBlur={() => form.touch("name")}
        // エラーは離れた後か送信を押した後だけ出る
        error={form.fieldError("name") !== null}
        helperText={form.fieldError("name")}
      />
      <TextField
        label="メールアドレス"
        value={state.values.email}
        onChange={(e) => form.setValue("email", e.target.value)}
        onBlur={() => form.touch("email")}
        error={form.fieldError("email") !== null}
        helperText={form.fieldError("email")}
      />
      <Button type="submit" disabled={state.submitting}>
        送信
      </Button>
    </form>
  )
}
