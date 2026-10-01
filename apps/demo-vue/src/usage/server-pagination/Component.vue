<script setup lang="ts">
import type { CursorPage, PageRequest } from "@hc/core"
import { CursorTable } from "@hc/vuetify"
import { columns, type Employee } from "../datatable/columns"

// 1 ページずつサーバーへ取りに行く (カーソル方式。DynamoDB の LastEvaluatedKey と同じ形)。
// 「次へ」は nextCursor を渡し、「前へ」は訪れたページのカーソルを覚えておいて戻る。
// 検索語を変えると 1 ページ目からやり直す (入力は少し待ってから送る)。
async function fetchPage({ limit, cursor, search }: PageRequest): Promise<CursorPage<Employee>> {
  const q = new URLSearchParams({ limit: String(limit), search })
  if (cursor) q.set("cursor", cursor)
  const res = await fetch(`/api/employees?${q}`)
  if (!res.ok) throw new Error(`取得に失敗しました (${res.status})`) // 画面にエラーとして出る
  return (await res.json()) as CursorPage<Employee> // { items, nextCursor, count? }
}
</script>

<template>
  <CursorTable
    :fetch-page="fetchPage"
    :columns="columns"
    :get-row-id="(e: Employee) => e.email"
    search-placeholder="サーバー側で絞り込み…"
  />
</template>
