<script setup lang="ts">
// 1 ページずつ API に取りに行く (カーソル方式)。検索もサーバー側で行う。
import { CursorTable } from "@hc/vuetify"
import { createEmployeeSource, type Employee } from "@hc/demo-data"
import { employeeColumns } from "./employeeColumns"

const source = createEmployeeSource(400)
const rowId = (e: Employee) => e.email
</script>

<template>
  <p class="text-body-2 text-medium-emphasis mb-2">
    「次へ」で nextCursor
    を渡して次のページを取りに行き、「前へ」は訪れたページのカーソルを積んでおいて戻る (DynamoDB の
    LastEvaluatedKey と同じ方式)。応答は 400ms 遅らせてある。
  </p>
  <CursorTable
    :fetch-page="source.fetchPage"
    :columns="employeeColumns"
    :get-row-id="rowId"
    search-placeholder="氏名・部署・役職で検索…（サーバー側で絞り込み）"
  />
</template>
