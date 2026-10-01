<script setup lang="ts">
import { computed, ref } from "vue"
import { countBetween, required } from "@core"
import { useForm } from "@/composables/useForm"
import { PREFECTURES, REGIONS } from "@demo-data"
import FormShell from "@/demo/FormShell.vue"
import { fakeSave } from "@/demo/fakeSave"

type Values = { region: string; pref: string; visited: string[] }
const initial: Values = { region: "", pref: "", visited: [] }

const saved = ref<Values | null>(null)
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
    saved.value = v
  },
})
const err = (k: keyof Values) => {
  void state.value // state を読んで、変化で描き直す
  return form.fieldError(k) ?? undefined
}
const prefItems = computed(() =>
  PREFECTURES.filter((p) => p.region === state.value.values.region).map((p) => ({
    title: p.name,
    value: p.code,
  })),
)
// 複数選択は地方ごとの見出しつき
const visitedItems = REGIONS.flatMap((r) => [
  { type: "subheader", title: r },
  ...PREFECTURES.filter((p) => p.region === r).map((p) => ({ title: p.name, value: p.code })),
])
const onRegion = (r: string) => {
  form.setValue("region", r)
  form.setValue("pref", "") // 地方を変えたら都道府県は選び直し
}
</script>

<template>
  <FormShell
    title="🔽 セレクト"
    description="地方を選ぶと都道府県の候補が絞られる (連動するセレクト)。複数選択はチップで出す。"
    :form="form"
    :state="state"
    :saved="saved"
  >
    <v-row density="compact">
      <v-col cols="12" sm="6">
        <v-select
          label="地方 *"
          :items="REGIONS"
          :model-value="state.values.region || null"
          :error-messages="err('region')"
          @update:model-value="onRegion"
          @blur="form.touch('region')"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          label="都道府県 *"
          :items="prefItems"
          :disabled="!state.values.region"
          :model-value="state.values.pref || null"
          :error-messages="err('pref')"
          :hint="state.values.region ? '' : '先に地方を選ぶ'"
          persistent-hint
          @update:model-value="(v: string) => form.setValue('pref', v)"
          @blur="form.touch('pref')"
        />
      </v-col>
    </v-row>
    <v-select
      label="行ったことのある所 (複数)"
      :items="visitedItems"
      multiple
      chips
      closable-chips
      :model-value="state.values.visited"
      :error-messages="err('visited')"
      :hint="`${state.values.visited.length} / 5 個`"
      persistent-hint
      @update:model-value="(v: string[]) => form.setValue('visited', v)"
      @update:menu="(open: boolean) => !open && form.touch('visited')"
    />
  </FormShell>
</template>
