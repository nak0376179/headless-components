<script setup lang="ts">
// Markdown を HTML にした文書を描く (中身は utils の README.md・SPEC.md。自前の文書なので HTML をそのまま入れる)。
import { MARKDOWN_CSS } from "@demo-data"

defineProps<{ html: string }>()
</script>

<template>
  <div class="hc-md">
    <component :is="'style'">{{ MARKDOWN_CSS }}</component>
    <!-- eslint-disable-next-line vue/no-v-html -- utils の README.md / SPEC.md (自前の文書) -->
    <div v-html="html" />
  </div>
</template>
