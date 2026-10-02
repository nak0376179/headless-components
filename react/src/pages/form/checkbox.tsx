import { useState } from "react"
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Stack,
  Switch,
} from "@mui/material"
import { countBetween, toggleInList } from "@/utils/draft"
import { useForm } from "@/hooks/draft/useForm"
import { HOBBIES } from "@demo-data"
import { FormShell, fakeSave } from "@/demo/FormShell"

type Values = { hobbies: string[]; newsletter: boolean; agree: boolean }
const initial: Values = { hobbies: [], newsletter: true, agree: false }
const ORDER = HOBBIES.map((h) => h.value as string)

export default function CheckboxPage() {
  const [saved, setSaved] = useState<Values | null>(null)
  const { state, controller: form } = useForm<Values>({
    initial,
    rules: {
      hobbies: countBetween(1, 3, "1〜3 個選んでください"),
      agree: (v) => (v ? null : "同意が必要です"),
    },
    onSubmit: async (v) => {
      await fakeSave()
      setSaved(v)
    },
  })
  const { hobbies } = state.values
  const all = hobbies.length === ORDER.length
  const some = hobbies.length > 0 && !all

  return (
    <FormShell
      title="☑️ チェックボックス"
      description="チェックした物を配列 (リスト) で持つ。並びはチェックした順ではなく選択肢の順に揃える (toggleInList)。「すべて」は一部だけ選ぶと中間の表示になる。"
      form={form}
      state={state}
      saved={saved}
    >
      <FormControl error={form.fieldError("hobbies") !== null} component="fieldset">
        <FormLabel component="legend">趣味 (1〜3 個)</FormLabel>
        <FormControlLabel
          label="すべて"
          control={
            <Checkbox
              checked={all}
              indeterminate={some}
              onChange={() => {
                form.setValue("hobbies", all ? [] : [...ORDER])
                form.touch("hobbies")
              }}
            />
          }
        />
        <FormGroup row sx={{ pl: 3 }}>
          {HOBBIES.map((h) => (
            <FormControlLabel
              key={h.value}
              label={h.label}
              control={
                <Checkbox
                  checked={hobbies.includes(h.value)}
                  onChange={() => {
                    form.setValue("hobbies", toggleInList(hobbies, h.value as string, ORDER))
                    form.touch("hobbies")
                  }}
                />
              }
            />
          ))}
        </FormGroup>
        <FormHelperText>
          {form.fieldError("hobbies") ??
            `選んだもの: ${hobbies.length ? hobbies.join(", ") : "なし"}`}
        </FormHelperText>
      </FormControl>

      <Stack>
        <FormControlLabel
          label="お知らせメールを受け取る"
          control={
            <Switch
              checked={state.values.newsletter}
              onChange={(e) => form.setValue("newsletter", e.target.checked)}
            />
          }
        />
        <FormControl error={form.fieldError("agree") !== null}>
          <FormControlLabel
            label="利用規約に同意する"
            control={
              <Checkbox
                checked={state.values.agree}
                onChange={(e) => {
                  form.setValue("agree", e.target.checked)
                  form.touch("agree")
                }}
              />
            }
          />
          <FormHelperText>{form.fieldError("agree") ?? " "}</FormHelperText>
        </FormControl>
      </Stack>
    </FormShell>
  )
}
