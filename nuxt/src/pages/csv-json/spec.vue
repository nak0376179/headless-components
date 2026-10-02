<script setup lang="ts">
// 詳しい仕様 (utils/src/csv-json/SPEC.md。別チームへ渡すものと同じ文書)。
import { CSV_SPEC_HTML } from "@demo-data"
import MarkdownDoc from "@/demo/MarkdownDoc.vue"
</script>

<template>
  <MarkdownDoc :html="CSV_SPEC_HTML" />
</template>
