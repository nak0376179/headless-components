<script setup lang="ts">
import { nextTick, ref } from "vue"
import { CsvJsonTextArea } from "@hc/vuetify"
import { demoColumns, demoSamples, usageLabel, type DemoSample } from "@hc/demo-data"

const text = ref("")
const active = ref<DemoSample | null>(null)
const area = ref<{ convert: () => unknown } | null>(null)

// サンプルをテキストエリアに流し込み、そのまま変換まで実行する。
const load = async (sample: DemoSample) => {
  text.value = sample.text
  active.value = sample
  await nextTick()
  area.value?.convert()
}
</script>

<template>
  <div class="page">
    <p class="text-body-2 text-medium-emphasis mb-4">
      CSV や TSV（Excel からのコピペ）を貼り付けて「変換」を押すと、列定義に従って検証し、JSON / CSV
      / TSV
      に変換します。ヘッダ・各セルの前後の空白（半角・全角スペース）は自動で取り除きます。エラーは
      行番号・項目名つきで最大 10 件まで表示します。
    </p>

    <v-table density="compact" class="mb-4 border rounded">
      <thead>
        <tr>
          <th>項目名</th>
          <th>キー</th>
          <th>扱い</th>
          <th>文字数</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in demoColumns" :key="c.key">
          <td>{{ c.label }}</td>
          <td>
            <code>{{ c.key }}</code>
          </td>
          <td>
            <v-chip size="small" variant="outlined">{{ usageLabel[c.usage] }}</v-chip>
          </td>
          <td>
            {{ c.minLength || c.maxLength ? `${c.minLength ?? 0}〜${c.maxLength ?? ""}文字` : "—" }}
          </td>
        </tr>
      </tbody>
    </v-table>

    <div class="text-body-2 text-medium-emphasis mb-2">
      サンプルを選ぶと、読み込んでそのまま変換します:
    </div>
    <div class="samples mb-2">
      <v-btn
        v-for="s in demoSamples"
        :key="s.label"
        size="small"
        :variant="active?.label === s.label ? 'flat' : 'outlined'"
        :color="active?.label === s.label ? 'primary' : undefined"
        @click="load(s)"
      >
        {{ s.label }}
      </v-btn>
    </div>
    <v-alert v-if="active" type="info" variant="tonal" density="compact" class="mb-4">
      <strong>{{ active.label }}</strong> — {{ active.description }}
    </v-alert>

    <CsvJsonTextArea ref="area" v-model="text" :columns="demoColumns" />
  </div>
</template>

<style scoped>
.page {
  max-width: 820px;
}
.samples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
