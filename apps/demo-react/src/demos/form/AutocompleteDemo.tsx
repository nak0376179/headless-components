import { useState } from "react"
import { Autocomplete, Chip, TextField, Typography } from "@mui/material"
import { countBetween, filterOptions, required } from "@hc/core"
import { useForm } from "@hc/react"
import { PREFECTURES, prefectureSearchText, type Prefecture } from "@hc/demo-data"
import { FormShell, fakeSave } from "./FormShell"

type Values = { home: Prefecture | null; wish: Prefecture[] }
const initial: Values = { home: null, wish: [] }
const WISH_MAX = 3

// 候補の絞り込みはコアの filterOptions (ひらがな/カタカナ・全角/半角の違いを無視、空白区切りで AND)。
// 「きょうと」「キョウト」「ｷｮｳﾄ」どれでも東京都と京都府が出る。
const filter = (options: Prefecture[], { inputValue }: { inputValue: string }) =>
  filterOptions(options, inputValue, prefectureSearchText)

export function AutocompleteDemo() {
  const [saved, setSaved] = useState<Values | null>(null)
  const { state, controller: form } = useForm<Values>({
    initial,
    rules: {
      home: required("住んでいる所を選んでください"),
      wish: countBetween(1, WISH_MAX, `1〜${WISH_MAX} 個選んでください`),
    },
    onSubmit: async (v) => {
      await fakeSave()
      setSaved(v)
    },
  })
  const { home, wish } = state.values

  return (
    <FormShell
      title="🔎 AutoComplete"
      description="打った文字で候補を絞る。読み (ひらがな・カタカナ・半角カナ) でも漢字でも当たり、空白で区切ると AND になる。"
      form={form}
      state={state}
      saved={saved}
    >
      <Autocomplete
        options={PREFECTURES}
        value={home}
        onChange={(_, v) => form.setValue("home", v)}
        onBlur={() => form.touch("home")}
        filterOptions={filter}
        getOptionLabel={(p) => p.name}
        isOptionEqualToValue={(a, b) => a.code === b.code}
        groupBy={(p) => p.region}
        renderOption={(props, p) => {
          const { key, ...rest } = props
          return (
            <li key={key} {...rest}>
              {p.name}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {p.kana}
              </Typography>
            </li>
          )
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="住んでいる所"
            required
            error={form.fieldError("home") !== null}
            helperText={form.fieldError("home") ?? "例: とうきょう / ｵｵｻｶ / ふく けん"}
          />
        )}
      />
      <Autocomplete
        multiple
        options={PREFECTURES}
        value={wish}
        onChange={(_, v) => {
          form.setValue("wish", v)
          form.touch("wish")
        }}
        filterOptions={filter}
        getOptionLabel={(p) => p.name}
        isOptionEqualToValue={(a, b) => a.code === b.code}
        getOptionDisabled={(p) => wish.length >= WISH_MAX && !wish.some((w) => w.code === p.code)}
        disableCloseOnSelect
        renderValue={(selected, getItemProps) =>
          selected.map((p, index) => {
            const { key, ...itemProps } = getItemProps({ index })
            return <Chip key={key} size="small" label={p.name} {...itemProps} />
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={`行ってみたい所 (${WISH_MAX} つまで)`}
            error={form.fieldError("wish") !== null}
            helperText={form.fieldError("wish") ?? `${wish.length} / ${WISH_MAX} 個`}
          />
        )}
      />
    </FormShell>
  )
}
