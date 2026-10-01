import { useState } from "react"
import {
  Box,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
} from "@mui/material"
import { countBetween, required } from "@core"
import { useForm } from "@/hooks/useForm"
import { PREFECTURES, REGIONS } from "@demo-data"
import { FormShell, fakeSave } from "@/demo/FormShell"

type Values = { region: string; pref: string; visited: string[] }
const initial: Values = { region: "", pref: "", visited: [] }
const nameOf = (code: string) => PREFECTURES.find((p) => p.code === code)?.name ?? code

export default function SelectPage() {
  const [saved, setSaved] = useState<Values | null>(null)
  const { state, controller: form } = useForm<Values>({
    initial,
    rules: {
      region: required("地方を選んでください"),
      // 他の項目を見る検査: 選んだ都道府県が地方と合っているか
      pref: [
        required("都道府県を選んでください"),
        (code, v) =>
          PREFECTURES.find((p) => p.code === code)?.region === v.region
            ? null
            : "地方と合っていません",
      ],
      visited: countBetween(1, 5, "行ったことのある所を 1〜5 個選んでください"),
    },
    onSubmit: async (v) => {
      await fakeSave()
      setSaved(v)
    },
  })
  const err = (k: keyof Values) => form.fieldError(k)

  return (
    <FormShell
      title="🔽 セレクト"
      description="地方を選ぶと都道府県の候補が絞られる (連動するセレクト)。複数選択はチップで出す。"
      form={form}
      state={state}
      saved={saved}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <FormControl fullWidth required error={err("region") !== null}>
          <InputLabel>地方</InputLabel>
          <Select
            label="地方"
            value={state.values.region}
            onChange={(e) => {
              form.setValue("region", e.target.value)
              form.setValue("pref", "") // 地方を変えたら都道府県は選び直し
            }}
            onBlur={() => form.touch("region")}
          >
            {REGIONS.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{err("region") ?? " "}</FormHelperText>
        </FormControl>
        <FormControl
          fullWidth
          required
          error={err("pref") !== null}
          disabled={!state.values.region}
        >
          <InputLabel>都道府県</InputLabel>
          <Select
            label="都道府県"
            value={state.values.pref}
            onChange={(e) => form.setValue("pref", e.target.value)}
            onBlur={() => form.touch("pref")}
          >
            {PREFECTURES.filter((p) => p.region === state.values.region).map((p) => (
              <MenuItem key={p.code} value={p.code}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {err("pref") ?? (state.values.region ? " " : "先に地方を選ぶ")}
          </FormHelperText>
        </FormControl>
      </Stack>

      <FormControl fullWidth error={err("visited") !== null}>
        <InputLabel>行ったことのある所 (複数)</InputLabel>
        <Select
          multiple
          label="行ったことのある所 (複数)"
          value={state.values.visited}
          onChange={(e) => form.setValue("visited", e.target.value as string[])}
          onClose={() => form.touch("visited")}
          renderValue={(codes) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {codes.map((c) => (
                <Chip key={c} size="small" label={nameOf(c)} />
              ))}
            </Box>
          )}
          MenuProps={{ slotProps: { paper: { sx: { maxHeight: 360 } } } }}
        >
          {REGIONS.flatMap((r) => [
            <ListSubheader key={`h-${r}`}>{r}</ListSubheader>,
            ...PREFECTURES.filter((p) => p.region === r).map((p) => (
              <MenuItem key={p.code} value={p.code}>
                {p.name}
              </MenuItem>
            )),
          ])}
        </Select>
        <FormHelperText>{err("visited") ?? `${state.values.visited.length} / 5 個`}</FormHelperText>
      </FormControl>
    </FormShell>
  )
}
