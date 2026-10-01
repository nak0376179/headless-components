<script setup lang="ts">
import { computed } from "vue"
import DataTable from "@/components/DataTable.vue"
import { columns, type Employee } from "./columns"

// 全件を渡すと、並べ替え・フリーワード検索・ページングを手元で行う。
// 検索は空白区切りの AND (「営業 在籍」)。全角/半角・ひらがな/カタカナの違いは無視する。
const props = defineProps<{ items: Employee[] }>()
const data = computed(() => props.items.filter((e) => e.status !== "retired"))
</script>

<template>
  <DataTable
    :data="data"
    :columns="columns"
    :get-row-id="(e: Employee) => e.email"
    :initial-page-size="25"
    search-placeholder="フリーワード検索 (空白で区切ると AND)"
  />
</template>
