<script setup lang="ts">
// utils だけで作る CSV/TSV の取り込み画面 (Vue / Nuxt)。UI ライブラリは使わない。
// 状態は createCsvJson が持つので、Vue は shallowRef に写して描くだけ。
import { onScopeDispose, shallowRef } from "vue"
import { createCsvJson, csvJsonErrorHeading, csvJsonPlaceholder, OUTPUT_FORMATS } from "@/utils"
import { columns } from "./columns"

const csv = createCsvJson({ columns })
const state = shallowRef(csv.get())
onScopeDispose(csv.subscribe(() => (state.value = csv.get())))
</script>

<template>
  <div>
    <textarea
      rows="8"
      cols="80"
      :value="state.text"
      :placeholder="csvJsonPlaceholder(columns)"
      @input="csv.setText(($event.target as HTMLTextAreaElement).value)"
    />
    <div>
      <label v-for="f in OUTPUT_FORMATS" :key="f.value">
        <input type="radio" :checked="state.format === f.value" @change="csv.setFormat(f.value)" />
        {{ f.label }}
      </label>
      <button @click="csv.convert()">変換</button>
    </div>
    <div v-if="state.result && !state.result.ok" role="alert">
      <p>{{ csvJsonErrorHeading(state.result.errors) }}</p>
      <ul>
        <li v-for="(e, i) in state.result.errors" :key="i">{{ e.message }}</li>
      </ul>
    </div>
    <pre v-if="state.result?.ok">{{ state.result.output }}</pre>
  </div>
</template>
