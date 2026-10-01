<script setup lang="ts">
import { ref } from "vue"
import { countBetween, filterOptions, required } from "@hc/core"
import { useForm } from "@hc/vue"
import { PREFECTURES, prefectureSearchText, type Prefecture } from "@hc/demo-data"
import FormShell from "./FormShell.vue"
import { fakeSave } from "./fakeSave"

type Values = { home: Prefecture | null; wish: Prefecture[] }
const initial: Values = { home: null, wish: [] }
const WISH_MAX = 3

const saved = ref<Values | null>(null)
const { state, controller: form } = useForm<Values>({
  initial,
  rules: {
    home: required("住んでいる所を選んでください"),
    wish: countBetween(1, WISH_MAX, `1〜${WISH_MAX} 個選んでください`),
  },
  onSubmit: async (v) => {
    await fakeSave()
    saved.value = v
  },
})
const err = (k: keyof Values) => {
  void state.value
  return form.fieldError(k) ?? undefined
}

// 候補の絞り込みはコアの filterOptions (ひらがな/カタカナ・全角/半角の違いを無視、空白区切りで AND)。
// 「きょうと」「キョウト」「ｷｮｳﾄ」どれでも東京都と京都府が出る。
// Vuetify の custom-filter は候補 1 件ずつ呼ばれるので、1 件だけの配列で判定する。
const customFilter = (_value: string, query: string, item?: { raw: Prefecture }) =>
  !item || filterOptions([item.raw], query, prefectureSearchText).length > 0
</script>

<template>
  <FormShell
    title="🔎 AutoComplete"
    description="打った文字で候補を絞る。読み (ひらがな・カタカナ・半角カナ) でも漢字でも当たり、空白で区切ると AND になる。"
    :form="form"
    :state="state"
    :saved="saved"
  >
    <v-autocomplete
      label="住んでいる所 *"
      :items="PREFECTURES"
      item-title="name"
      item-value="code"
      return-object
      :custom-filter="customFilter"
      :model-value="state.values.home"
      :error-messages="err('home')"
      hint="例: とうきょう / ｵｵｻｶ / ふく けん"
      persistent-hint
      @update:model-value="(p: Prefecture | null) => form.setValue('home', p)"
      @blur="form.touch('home')"
    >
      <template #item="{ props, item }">
        <v-list-item v-bind="props" :subtitle="item.kana" />
      </template>
    </v-autocomplete>
    <v-autocomplete
      :label="`行ってみたい所 (${WISH_MAX} つまで)`"
      :items="PREFECTURES"
      item-title="name"
      item-value="code"
      return-object
      multiple
      chips
      closable-chips
      :custom-filter="customFilter"
      :item-props="
        (p: Prefecture) => ({
          disabled:
            state.values.wish.length >= WISH_MAX &&
            !state.values.wish.some((w) => w.code === p.code),
        })
      "
      :model-value="state.values.wish"
      :error-messages="err('wish')"
      :hint="`${state.values.wish.length} / ${WISH_MAX} 個`"
      persistent-hint
      @update:model-value="
        (v: Prefecture[]) => {
          form.setValue('wish', v)
          form.touch('wish')
        }
      "
    />
  </FormShell>
</template>
