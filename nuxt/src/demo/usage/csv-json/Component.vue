<script setup lang="ts">
import type { ConvertResult } from "@core"
import CsvJsonTextArea from "@/components/CsvJsonTextArea.vue"
import { columns } from "./columns"

// 貼り付け欄・形式の切り替え・変換ボタン・エラー表示・結果のコピーまで入った完成品。
const onConvert = (result: ConvertResult) => {
  if (result.ok) {
    // [{ name: "山田 太郎", kana: "ヤマダタロウ", email: "…", … }] (キーは列定義の順)
    console.log(result.rows, result.output)
  } else {
    // [{ row: 3, label: "メールアドレス", message: "3行目「メールアドレス」: …" }] (最大 10 件)
    console.warn(result.errors)
  }
}
</script>

<template>
  <!-- default-format: "json" | "csv" | "tsv" -->
  <CsvJsonTextArea :columns="columns" :rows="10" default-format="json" @convert="onConvert" />
</template>
