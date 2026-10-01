<script setup lang="ts">
import { computed, ref } from "vue"
import { countBetween, toggleInList } from "@hc/core"
import { useForm } from "@hc/vue"
import { HOBBIES } from "@hc/demo-data"
import FormShell from "./FormShell.vue"
import { fakeSave } from "./fakeSave"

type Values = { hobbies: string[]; newsletter: boolean; agree: boolean }
const initial: Values = { hobbies: [], newsletter: true, agree: false }
const ORDER = HOBBIES.map((h) => h.value as string)

const saved = ref<Values | null>(null)
const { state, controller: form } = useForm<Values>({
  initial,
  rules: {
    hobbies: countBetween(1, 3, "1〜3 個選んでください"),
    agree: (v) => (v ? null : "同意が必要です"),
  },
  onSubmit: async (v) => {
    await fakeSave()
    saved.value = v
  },
})
const hobbies = computed(() => state.value.values.hobbies)
const all = computed(() => hobbies.value.length === ORDER.length)
const some = computed(() => hobbies.value.length > 0 && !all.value)
const err = (k: keyof Values) => {
  void state.value
  return form.fieldError(k)
}
const toggle = (v: string) => {
  form.setValue("hobbies", toggleInList(hobbies.value, v, ORDER))
  form.touch("hobbies")
}
const toggleAll = () => {
  form.setValue("hobbies", all.value ? [] : [...ORDER])
  form.touch("hobbies")
}
</script>

<template>
  <FormShell
    title="☑️ チェックボックス"
    description="チェックした物を配列 (リスト) で持つ。並びはチェックした順ではなく選択肢の順に揃える (toggleInList)。「すべて」は一部だけ選ぶと中間の表示になる。"
    :form="form"
    :state="state"
    :saved="saved"
  >
    <fieldset class="border-0">
      <legend :class="err('hobbies') ? 'text-error' : 'text-medium-emphasis'">
        趣味 (1〜3 個)
      </legend>
      <v-checkbox
        label="すべて"
        :model-value="all"
        :indeterminate="some"
        hide-details
        density="compact"
        @update:model-value="toggleAll"
      />
      <div class="d-flex flex-wrap pl-6">
        <v-checkbox
          v-for="h in HOBBIES"
          :key="h.value"
          :label="h.label"
          :model-value="hobbies.includes(h.value)"
          hide-details
          density="compact"
          class="mr-4"
          @update:model-value="toggle(h.value)"
        />
      </div>
      <div :class="['text-caption', err('hobbies') ? 'text-error' : 'text-medium-emphasis']">
        {{ err("hobbies") ?? `選んだもの: ${hobbies.length ? hobbies.join(", ") : "なし"}` }}
      </div>
    </fieldset>

    <v-switch
      label="お知らせメールを受け取る"
      color="primary"
      :model-value="state.values.newsletter"
      hide-details
      @update:model-value="(v) => form.setValue('newsletter', !!v)"
    />
    <v-checkbox
      label="利用規約に同意する"
      :model-value="state.values.agree"
      :error-messages="err('agree') ?? undefined"
      @update:model-value="
        (v) => {
          form.setValue('agree', !!v)
          form.touch('agree')
        }
      "
    />
  </FormShell>
</template>
