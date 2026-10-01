import { useState, type ChangeEvent } from "react"
import { Divider, InputAdornment, Stack, TextField, Typography } from "@mui/material"
import { email, maxChars, pattern, required, whenFilled, zenkakuKatakana } from "@hc/core"
import { useForm } from "@hc/react"
import { CsvJsonDemo } from "../CsvJsonDemo"
import { FormShell, fakeSave } from "./FormShell"

type Profile = {
  name: string
  kana: string
  email: string
  phone: string
  zip: string
  bio: string
}
const initial: Profile = { name: "", kana: "", email: "", phone: "", zip: "", bio: "" }
const BIO_MAX = 200

export function TextboxDemo() {
  const [saved, setSaved] = useState<Profile | null>(null)
  const { state, controller: form } = useForm<Profile>({
    initial,
    rules: {
      name: [required("氏名を入力してください"), maxChars(20)],
      kana: whenFilled(zenkakuKatakana()),
      email: [required("メールアドレスを入力してください"), whenFilled(email())],
      phone: whenFilled(pattern(/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/, "電話番号の形式ではありません")),
      zip: whenFilled(pattern(/^\d{3}-?\d{4}$/, "郵便番号は 123-4567 の形で入力してください")),
      bio: maxChars(BIO_MAX),
    },
    onSubmit: async (v) => {
      await fakeSave()
      setSaved(v)
    },
  })
  // 1 項目ぶんの props (値・変更・離れた・エラー表示) をまとめて渡す
  const field = (key: keyof Profile) => ({
    value: state.values[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => form.setValue(key, e.target.value),
    onBlur: () => form.touch(key),
    error: form.fieldError(key) !== null,
    helperText: form.fieldError(key) ?? " ",
  })

  return (
    <Stack spacing={4}>
      <FormShell
        title="📝 テキストボックス"
        description="入力しながら検査し、エラーは項目から離れた後か送信を押した後に出す。検査は CSV 変換と同じ関数 (email・zenkakuKatakana など) を使える。"
        form={form}
        state={state}
        saved={saved}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="氏名" required fullWidth {...field("name")} />
          <TextField label="フリガナ" fullWidth placeholder="ヤマダ タロウ" {...field("kana")} />
        </Stack>
        <TextField label="メールアドレス" type="email" required {...field("email")} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="電話番号" fullWidth placeholder="03-1234-5678" {...field("phone")} />
          <TextField
            label="郵便番号"
            fullWidth
            {...field("zip")}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">〒</InputAdornment> },
            }}
          />
        </Stack>
        <TextField
          label="自己紹介"
          multiline
          minRows={3}
          {...field("bio")}
          helperText={form.fieldError("bio") ?? `${[...state.values.bio].length} / ${BIO_MAX} 文字`}
        />
      </FormShell>

      <Divider />
      <div>
        <Typography variant="h6">📋 CSV / TSV の一括入力</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          テキストボックスに Excel などから貼り付けた表を、列定義に従って検査して JSON / CSV / TSV
          に変換する。
        </Typography>
        <CsvJsonDemo />
      </div>
    </Stack>
  )
}
