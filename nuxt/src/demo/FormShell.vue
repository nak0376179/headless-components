<script setup lang="ts" generic="T extends object">
// フォームのデモの共通枠: 見出し・本体・送信ボタン・いまの値 (JSON)・送信結果 (React 版の FormShell と同じ)。
import type { FormController, FormState } from "@/utils/draft"

defineProps<{
  title: string
  description: string
  form: FormController<T>
  state: FormState<T>
  /** 送信できた値 (表示用)。 */
  saved: T | null
}>()
const show = (v: unknown) => (v === null ? "—" : JSON.stringify(v, null, 2))
</script>

<template>
  <v-card variant="outlined" class="pa-6">
    <div class="text-h6">{{ title }}</div>
    <p class="text-body-2 text-medium-emphasis mb-6">{{ description }}</p>
    <form novalidate @submit.prevent="form.submit()">
      <div class="d-flex flex-column ga-2">
        <slot />
      </div>
      <v-alert v-if="state.submitError" type="error" class="mt-4">{{ state.submitError }}</v-alert>
      <div class="d-flex ga-2 mt-6">
        <v-btn type="submit" color="primary" :loading="state.submitting">送信</v-btn>
        <v-btn variant="text" :disabled="!state.dirty || state.submitting" @click="form.reset()">
          リセット
        </v-btn>
      </div>
    </form>
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <div class="text-caption text-medium-emphasis">いまの値</div>
        <pre class="value">{{ show(state.values) }}</pre>
      </v-col>
      <v-col cols="12" md="6">
        <div class="text-caption text-medium-emphasis">送信した値</div>
        <pre class="value">{{ show(saved) }}</pre>
      </v-col>
    </v-row>
  </v-card>
</template>

<style scoped>
.value {
  margin: 0;
  padding: 12px;
  border-radius: 4px;
  background: rgba(128, 128, 128, 0.12);
  font-size: 12px;
  overflow-x: auto;
  min-height: 48px;
}
</style>
