<script setup lang="ts">
// 1 万件を 100 件ずつ読み込みながらスクロールする。描くのは見えている行だけ。
import { onBeforeUnmount, onMounted, ref } from "vue"
import type { DataTableColumn } from "@core"
import InfiniteTable from "@/components/InfiniteTable.vue"
import { createLargeEmployeeSource, type Employee } from "@demo-data"
import { employeeColumns } from "@/demo/employeeColumns"

const TOTAL = 10000
const source = createLargeEmployeeSource(TOTAL, 300)

// 幅を固定しておくと、スクロールで中身が入れ替わっても列がガタつかない (meta.width)
const WIDTHS: Record<string, number | string> = {
  email: "26%",
  name: 130,
  department: 150,
  role: 120,
  status: 100,
  joinedAt: 120,
  salary: 130,
}
const columns: DataTableColumn<Employee>[] = employeeColumns.map((c) => ({
  ...c,
  meta: { ...c.meta, width: WIDTHS[(c as { accessorKey?: string }).accessorKey ?? ""] },
}))

// 画面の書き換えの速さ (1 秒ごとに数える)
const fps = ref(0)
let frames = 0
let last = 0
let raf = 0
const tick = (now: number) => {
  frames++
  if (now - last >= 1000) {
    fps.value = Math.round((frames * 1000) / (now - last))
    frames = 0
    last = now
  }
  raf = requestAnimationFrame(tick)
}
// 画面にいる間だけ数える
onMounted(() => {
  last = performance.now()
  raf = requestAnimationFrame(tick)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <p class="text-body-2 text-medium-emphasis">
      下までスクロールすると次の 100 件を読む (残り 30 行で先読みするので、普通の速さなら待たない)。
      見えている行 ± 8 行だけを描く仮想スクロールなので、何千件読み込んでも DOM の行は数十行のまま。
      検索はサーバー側 (模擬 API) で行い、最初から読み直す。
    </p>
    <div class="d-flex ga-2">
      <v-chip size="small">全 {{ TOTAL.toLocaleString() }} 件</v-chip>
      <v-chip size="small">1 回 100 件 / 応答 300ms</v-chip>
      <v-chip size="small" :color="fps >= 50 ? 'success' : fps >= 30 ? 'warning' : 'error'">
        滑らかさ {{ fps }} fps
      </v-chip>
    </div>
    <InfiniteTable
      :fetch-page="source.fetchPage"
      :columns="columns"
      :get-row-id="(e: Employee) => e.email"
      :page-size="100"
      :row-height="40"
      :height="520"
      search-placeholder="氏名・部署・役職で検索…（サーバー側で絞り込み）"
    />
  </div>
</template>
