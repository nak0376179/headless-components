<script setup lang="ts">
// Markdown を HTML にした文書を描く (中身は utils の README.md・SPEC.md。自前の文書なので HTML をそのまま入れる)。
import { MARKDOWN_CSS } from "@demo-data"

defineProps<{ html: string }>()

// 文書の中のページへのリンク (href="#nav:/csv-json/spec") はルーターで開く (置き場のパスの下でも動くように)
const onClick = (e: MouseEvent) => {
  const href = (e.target as HTMLElement).closest("a")?.getAttribute("href")
  if (href?.startsWith("#nav:")) {
    e.preventDefault()
    navigateTo(href.slice("#nav:".length))
  }
}
</script>

<template>
  <div class="hc-md" @click="onClick">
    <component :is="'style'">{{ MARKDOWN_CSS }}</component>
    <!-- eslint-disable-next-line vue/no-v-html -- utils の README.md / SPEC.md (自前の文書) -->
    <div v-html="html" />
  </div>
</template>
