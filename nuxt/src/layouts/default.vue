<script setup lang="ts">
// デモ全体の枠 (タイトル・上位タブ・小タブ・コードの使い方)。ページは <slot /> に入る。
// URL は React 版と同じ /<tab>/<page> なので、「React 版」のリンクは同じパスを開くだけ。
import { computed, onMounted } from "vue"
import { useTheme } from "vuetify"
import { NAV, navPath, resolveNav } from "@demo-data"
import UsageSection from "@/demo/usage/UsageSection.vue"

const route = useRoute()
// もう一方 (React 版) の URL。公開するときはビルド時に NUXT_PUBLIC_REACT_URL で差し替える (scripts/deploy-demos.mjs)。
const reactUrl = useRuntimeConfig().public.reactUrl
const current = computed(() => resolveNav(route.path))
const tab = computed(() => current.value.tab)
const page = computed(() => current.value.page)
// v-tabs はページの切り替え中にも今の値で update を出すので、変わったときだけ動く。
const goTab = (v: unknown) => {
  if (v !== tab.value.slug) navigateTo(resolveNav(String(v)).path)
}
const goPage = (v: unknown) => {
  const known = tab.value.pages.some((p) => p.slug === v) // 切り替え中は前のタブの小タブが値を出す
  if (known && v !== page.value.slug) navigateTo(navPath(tab.value, { slug: String(v), label: "" }))
}

// 旧版 (#slug で切り替えていた頃) のブックマーク。/ に付いた #slug をページのパスに読み替える。
onMounted(() => {
  if (route.hash) navigateTo(resolveNav(route.hash).path, { replace: true })
})

const theme = useTheme()
const toggleTheme = () => theme.change(theme.current.value.dark ? "light" : "dark")
</script>

<template>
  <v-app>
    <v-app-bar density="comfortable" flat border="b">
      <v-app-bar-title>🧩 headless-components — Nuxt + Vuetify</v-app-bar-title>
      <v-btn
        variant="text"
        size="small"
        :href="`${reactUrl}${route.path}`"
        title="同じ utils を React + MUI で包んだ版"
      >
        React 版 ↗
      </v-btn>
      <v-btn icon="mdi-theme-light-dark" aria-label="テーマ切り替え" @click="toggleTheme" />
      <template #extension>
        <v-tabs :model-value="tab.slug" show-arrows @update:model-value="goTab">
          <template v-for="(t, i) in NAV" :key="t.slug">
            <!-- main と draft の境目に見出しを置く (押せない) -->
            <v-tab v-if="t.draft && !NAV[i - 1]?.draft" disabled class="px-2" style="min-width: 0">
              🧪 Draft
            </v-tab>
            <v-tab :value="t.slug" :class="t.draft ? 'draft-tab' : 'font-weight-bold'">
              {{ t.label }}
            </v-tab>
          </template>
        </v-tabs>
      </template>
    </v-app-bar>
    <v-main>
      <v-tabs
        v-if="tab.pages.length > 1"
        :key="tab.slug"
        :model-value="page.slug"
        density="compact"
        show-arrows
        class="border-b"
        @update:model-value="goPage"
      >
        <v-tab v-for="p in tab.pages" :key="p.slug" :value="p.slug">{{ p.label }}</v-tab>
      </v-tabs>
      <v-container class="py-8" style="max-width: 1200px">
        <v-alert v-if="tab.draft" type="info" variant="outlined" density="compact" class="mb-6">
          🧪 Draft — main (CSV/TSV → JSON・データテーブル) 以外の試作。仕様は変わりうるし、pnpm
          vendor の既定では取り込まない (--draft で取り込む)。
        </v-alert>
        <slot />
        <UsageSection :key="`usage-${page.slug}`" :slug="page.slug" />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.draft-tab {
  opacity: 0.75;
}
</style>
