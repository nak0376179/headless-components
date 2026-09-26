<script setup lang="ts">
// ルーターは使わず #slug で切り替える (React 版と同じ URL で同じデモが開く)。
import { computed, onBeforeUnmount, ref } from "vue"
import { useTheme } from "vuetify"
import { demos } from "./demos/registry"

const currentSlug = () => {
  const slug = location.hash.slice(1)
  return demos.some((d) => d.slug === slug) ? slug : demos[0].slug
}
const slug = ref(currentSlug())
const onHash = () => (slug.value = currentSlug())
addEventListener("hashchange", onHash)
onBeforeUnmount(() => removeEventListener("hashchange", onHash))

// テンプレートからは location を直接触れないので関数を通す。
const go = (v: unknown) => (location.hash = String(v))
const demo = computed(() => demos.find((d) => d.slug === slug.value)!)
const theme = useTheme()
const toggleTheme = () => theme.change(theme.global.current.value.dark ? "light" : "dark")
</script>

<template>
  <v-app>
    <v-app-bar density="comfortable" flat border="b">
      <v-app-bar-title>🧩 headless-components — Vue + Vuetify</v-app-bar-title>
      <v-btn
        variant="text"
        size="small"
        :href="`http://localhost:5210/#${slug}`"
        title="同じコアを MUI で包んだ版"
      >
        React 版 ↗
      </v-btn>
      <v-btn icon="mdi-theme-light-dark" aria-label="テーマ切り替え" @click="toggleTheme" />
      <template #extension>
        <v-tabs :model-value="slug" show-arrows @update:model-value="go">
          <v-tab v-for="d in demos" :key="d.slug" :value="d.slug">{{ d.label }}</v-tab>
        </v-tabs>
      </template>
    </v-app-bar>
    <v-main>
      <v-container class="py-8" style="max-width: 1200px">
        <component :is="demo.component" :key="demo.slug" />
      </v-container>
    </v-main>
  </v-app>
</template>
