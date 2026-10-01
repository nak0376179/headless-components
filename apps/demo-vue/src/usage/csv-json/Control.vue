<script setup lang="ts">
import { ref } from "vue"
import { CsvJsonTextArea } from "@hc/vuetify"
import { columns } from "./columns"

// ref で外から流し込んで変換する (ファイル読み込み・サンプル投入など)。
const area = ref<InstanceType<typeof CsvJsonTextArea> | null>(null)

const onFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  area.value?.setText(await file.text())
  area.value?.convert()
}
</script>

<template>
  <v-btn variant="outlined" tag="label">
    CSV / TSV ファイルを選ぶ
    <input hidden type="file" accept=".csv,.tsv,.txt" @change="onFile" />
  </v-btn>
  <CsvJsonTextArea ref="area" :columns="columns" />
</template>
