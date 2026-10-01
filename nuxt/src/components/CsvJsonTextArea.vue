<script setup lang="ts">
// CSV/TSV を貼り付けて JSON / CSV / TSV に変換するテキストエリア (Vuetify)。
// 状態と変換は @core の createCsvJson が持ち、ここは描くだけ。
import { computed, watch } from "vue"
import {
  csvJsonErrorHeading,
  csvJsonPlaceholder,
  csvJsonResultHeading,
  OUTPUT_FORMATS,
  type ColumnSpec,
  type ConvertResult,
  type OutputFormat,
} from "@core"
import { useCsvJson } from "@/composables/useCsvJson"

const props = withDefaults(
  defineProps<{ columns: ColumnSpec[]; rows?: number; defaultFormat?: OutputFormat }>(),
  { rows: 8, defaultFormat: "json" },
)
const emit = defineEmits<{ convert: [result: ConvertResult] }>()

// 入力テキストは v-model で外から差し込める (デモのサンプル読み込みなど)。
const text = defineModel<string>({ default: "" })

const { state, controller } = useCsvJson({
  columns: () => props.columns,
  text: text.value,
  format: props.defaultFormat,
  onConvert: (r) => emit("convert", r),
})
watch(text, (t) => controller.setText(t))
watch(
  () => state.value.text,
  (t) => (text.value = t),
)

const format = computed({
  get: () => state.value.format,
  set: (f: OutputFormat) => controller.setFormat(f),
})
const result = computed(() => state.value.result)
const placeholder = computed(() => csvJsonPlaceholder(props.columns))

defineExpose({ convert: controller.convert, setText: controller.setText })
</script>

<template>
  <div class="csv-json">
    <v-textarea
      :model-value="state.text"
      label="CSV/TSV 入力"
      :placeholder="placeholder"
      :rows="rows"
      variant="outlined"
      hide-details
      auto-grow
      @update:model-value="(v: string) => controller.setText(v)"
    />

    <div class="controls">
      <v-btn color="primary" @click="controller.convert()">変換</v-btn>
      <v-radio-group v-model="format" inline hide-details>
        <v-radio v-for="f in OUTPUT_FORMATS" :key="f.value" :label="f.label" :value="f.value" />
      </v-radio-group>
    </div>

    <v-alert v-if="result && !result.ok" type="error" variant="tonal">
      <div class="errors-head">{{ csvJsonErrorHeading(result.errors) }}</div>
      <ul class="errors-list">
        <li v-for="(e, i) in result.errors" :key="i">{{ e.message }}</li>
      </ul>
    </v-alert>

    <v-card v-else-if="result?.ok" variant="outlined">
      <v-card-title class="result-head">
        <span>{{ csvJsonResultHeading(result.rows.length, format) }}</span>
        <v-btn size="small" variant="text" @click="controller.copyOutput()">コピー</v-btn>
      </v-card-title>
      <v-card-text>
        <pre aria-label="変換結果" class="output">{{ result.output }}</pre>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.csv-json {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.controls {
  display: flex;
  align-items: center;
  gap: 24px;
}
.errors-head {
  font-weight: 600;
}
.errors-list {
  margin: 8px 0 0;
  padding-left: 20px;
  max-height: 240px;
  overflow: auto;
}
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 1rem;
}
.output {
  margin: 0;
  font-size: 13px;
  max-height: 320px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
