<script setup lang="ts">
import { computed } from "vue"
import { paginationSummary } from "@core"
import { useDataTable } from "@/composables/useDataTable"
import { columns, type Employee } from "./columns"

// 見た目を自前で作る。table は TanStack Table 本体 (それ自体はリアクティブではない) なので、
// state を読んで依存を作ってから table を読む。
const props = defineProps<{ data: Employee[] }>()
const { table, state } = useDataTable({ data: () => props.data, columns, initialPageSize: 10 })
const rows = computed(() => {
  void state.value
  return table.getRowModel().rows
})
const summary = computed(() => {
  void state.value
  return paginationSummary(table).label
})
</script>

<template>
  <input
    :value="state.state.globalFilter ?? ''"
    placeholder="検索"
    @input="table.setGlobalFilter(($event.target as HTMLInputElement).value)"
  />
  <table>
    <tbody>
      <tr v-for="row in rows" :key="row.id">
        <td v-for="cell in row.getVisibleCells()" :key="cell.id">{{ cell.getValue() }}</td>
      </tr>
    </tbody>
  </table>
  <span>{{ summary }}</span>
  <button :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">前へ</button>
  <button :disabled="!table.getCanNextPage()" @click="table.nextPage()">次へ</button>
</template>
