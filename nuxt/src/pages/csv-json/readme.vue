<script setup lang="ts">
// 機能と使い方 (utils/src/csv-json/README.md。別チームへ渡すものと同じ文書)。
import { CSV_README_HTML } from "@demo-data"
import MarkdownDoc from "@/demo/MarkdownDoc.vue"
</script>

<template>
  <MarkdownDoc :html="CSV_README_HTML" />
</template>
