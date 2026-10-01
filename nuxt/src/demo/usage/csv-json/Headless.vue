<script setup lang="ts">
import { csvJsonErrorHeading, csvJsonResultHeading, OUTPUT_FORMATS, type OutputFormat } from "@core"
import { useCsvJson } from "@/composables/useCsvJson"
import { columns } from "./columns"

// 見た目を自前で作る。状態 (入力・形式・結果) と操作は composable が持ち、ここは描くだけ。
// state は shallowRef だが、テンプレートでは自動で開くので state.text のように書ける。
const { state, controller } = useCsvJson({ columns })
</script>

<template>
  <div>
    <textarea
      :value="state.text"
      @input="controller.setText(($event.target as HTMLTextAreaElement).value)"
    />
    <select
      :value="state.format"
      @change="controller.setFormat(($event.target as HTMLSelectElement).value as OutputFormat)"
    >
      <option v-for="f in OUTPUT_FORMATS" :key="f.value" :value="f.value">{{ f.label }}</option>
    </select>
    <button @click="controller.convert()">変換</button>

    <template v-if="state.result && !state.result.ok">
      <p>{{ csvJsonErrorHeading(state.result.errors) }}</p>
      <ul>
        <li v-for="e in state.result.errors" :key="e.message">{{ e.message }}</li>
      </ul>
    </template>
    <template v-else-if="state.result?.ok">
      <p>{{ csvJsonResultHeading(state.result.rows.length, state.format) }}</p>
      <pre>{{ state.result.output }}</pre>
      <button @click="controller.copyOutput()">コピー</button>
    </template>
  </div>
</template>
