<script setup lang="ts">
import { computed, ref } from "vue"
import { countBetween } from "@core"
import { useForm } from "@/composables/useForm"
import { PLANS } from "@demo-data"
import FormShell from "@/demo/FormShell.vue"
import { fakeSave } from "@/demo/fakeSave"

type Billing = "monthly" | "yearly"
type Entry = { plan: string; billing: Billing }
type Values = { plan: string; billing: Billing; list: Entry[] }
const initial: Values = { plan: "free", billing: "monthly", list: [] }
const planLabel = (v: string) => PLANS.find((p) => p.value === v)?.label ?? v
const BILLING_LABEL: Record<Billing, string> = { monthly: "月払い", yearly: "年払い" }
const MAX = 5

const saved = ref<Values | null>(null)
const { state, controller: form } = useForm<Values>({
  initial,
  rules: {
    list: countBetween(1, MAX, `「リストに保存」で 1〜${MAX} 件ためてから送信してください`),
  },
  onSubmit: async (v) => {
    await fakeSave()
    saved.value = v
  },
})
const v = computed(() => state.value.values)
const already = computed(() =>
  v.value.list.some((e) => e.plan === v.value.plan && e.billing === v.value.billing),
)
const listError = computed(() => {
  void state.value
  return form.fieldError("list")
})
const add = () => {
  form.setValue("list", [...v.value.list, { plan: v.value.plan, billing: v.value.billing }])
  form.touch("list")
}
const remove = (i: number) =>
  form.setValue(
    "list",
    v.value.list.filter((_, j) => j !== i),
  )
</script>

<template>
  <FormShell
    title="🔘 ラジオボタン"
    description="ラジオで 1 つ選び、「リストに保存」で選んだ組み合わせを一覧にためる (同じ組み合わせは 1 回だけ)。送信するとその一覧を送る。"
    :form="form"
    :state="state"
    :saved="saved"
  >
    <div class="text-medium-emphasis">プラン (カード型のラジオ)</div>
    <v-radio-group
      :model-value="v.plan"
      hide-details
      @update:model-value="(p) => form.setValue('plan', String(p))"
    >
      <v-row density="compact">
        <v-col v-for="p in PLANS" :key="p.value" cols="12" sm="4">
          <v-card
            :variant="v.plan === p.value ? 'tonal' : 'outlined'"
            :color="v.plan === p.value ? 'primary' : undefined"
            class="pa-3"
            @click="form.setValue('plan', p.value)"
          >
            <v-radio :value="p.value">
              <template #label>
                <strong>{{ p.label }}</strong>
              </template>
            </v-radio>
            <div class="text-h6">{{ p.price }}</div>
            <div class="text-caption text-medium-emphasis">{{ p.note }}</div>
          </v-card>
        </v-col>
      </v-row>
    </v-radio-group>

    <div class="text-medium-emphasis mt-2">支払い</div>
    <v-radio-group
      inline
      :model-value="v.billing"
      hide-details
      @update:model-value="(b) => form.setValue('billing', b as Billing)"
    >
      <v-radio
        v-for="(label, b) in BILLING_LABEL"
        :key="b"
        :value="b"
        :label="label"
        class="mr-4"
      />
    </v-radio-group>

    <div>
      <v-btn
        variant="outlined"
        prepend-icon="mdi-playlist-plus"
        :disabled="already || v.list.length >= MAX"
        @click="add"
      >
        {{ already ? "保存済み" : "リストに保存" }}
      </v-btn>
      <v-list density="compact" class="mt-2 border rounded">
        <v-list-item v-if="v.list.length === 0" subtitle="まだありません" />
        <v-list-item
          v-for="(e, i) in v.list"
          :key="`${e.plan}-${e.billing}`"
          :title="`${i + 1}. ${planLabel(e.plan)}`"
          :subtitle="BILLING_LABEL[e.billing]"
        >
          <template #append>
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              aria-label="削除"
              @click="remove(i)"
            />
          </template>
        </v-list-item>
      </v-list>
      <div :class="['text-caption mt-1', listError ? 'text-error' : 'text-medium-emphasis']">
        {{ listError ?? `${v.list.length} / ${MAX} 件` }}
      </div>
    </div>
  </FormShell>
</template>
