<script setup lang="ts">
import type { CursorPage, PageRequest } from "@core"
import InfiniteTable from "@/components/InfiniteTable.vue"
import { columns, type Employee } from "../datatable/columns"

// fetchPage はサーバーページネーションと同じ形。そのまま無限スクロールにも使える。
async function fetchPage({ limit, cursor, search }: PageRequest): Promise<CursorPage<Employee>> {
  const q = new URLSearchParams({ limit: String(limit), search })
  if (cursor) q.set("cursor", cursor)
  const res = await fetch(`/api/employees?${q}`)
  if (!res.ok) throw new Error(`取得に失敗しました (${res.status})`) // 表の下に「再試行」つきで出る
  return (await res.json()) as CursorPage<Employee>
}

// 列幅は meta.width で固定する (行を入れ替えながら描くので、自動の幅だとガタつく)
const fixed = columns.map((c, i) => ({ ...c, meta: { ...c.meta, width: [160, 160, 100, 140][i] } }))
</script>

<template>
  <!-- page-size: 1 回に取る件数 / row-height: 行の高さは一定 / prefetch-rows: 残り 30 行で次を読む -->
  <InfiniteTable
    :fetch-page="fetchPage"
    :columns="fixed"
    :get-row-id="(e: Employee) => e.email"
    :page-size="100"
    :row-height="40"
    :height="600"
    :prefetch-rows="30"
  />
</template>
