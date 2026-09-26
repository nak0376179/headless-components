<script setup lang="ts" generic="T">
// ヘッダ (並べ替えつき) と行を描く。DataTable と CursorTable で共用。
// 列定義の header / cell は文字列か「VNode・文字列を返す関数」(h() で書く)。
import { computed } from "vue"
import { resolveTemplate, type Table } from "@hc/core"
import RenderValue from "./RenderValue"

const props = withDefaults(
  defineProps<{
    table: Table<T>
    /** table の状態が変わるたびに変わる値 (これで再描画させる)。 */
    version: unknown
    loading?: boolean
    empty?: string
  }>(),
  { loading: false, empty: "該当するデータがありません" },
)

// table 自体はリアクティブではないので、version を読むことで状態変化に追従させる。
const view = computed(() => {
  void props.version
  return {
    headerGroups: props.table.getHeaderGroups(),
    rows: props.table.getRowModel().rows,
    colSpan: props.table.getVisibleLeafColumns().length,
  }
})

const sortIcon = (sorted: false | "asc" | "desc") =>
  sorted === "asc" ? "mdi-arrow-up" : sorted === "desc" ? "mdi-arrow-down" : "mdi-swap-vertical"
</script>

<template>
  <v-table density="compact">
    <thead>
      <tr v-for="hg in view.headerGroups" :key="hg.id">
        <th
          v-for="header in hg.headers"
          :key="header.id"
          :aria-sort="
            header.column.getIsSorted() === 'asc'
              ? 'ascending'
              : header.column.getIsSorted() === 'desc'
                ? 'descending'
                : undefined
          "
        >
          <template v-if="!header.isPlaceholder">
            <button
              v-if="header.column.getCanSort()"
              type="button"
              class="sort"
              :class="{ active: !!header.column.getIsSorted() }"
              @click="header.column.toggleSorting()"
            >
              <RenderValue
                :value="resolveTemplate(header.column.columnDef.header, header.getContext())"
              />
              <v-icon :icon="sortIcon(header.column.getIsSorted())" size="x-small" />
            </button>
            <RenderValue
              v-else
              :value="resolveTemplate(header.column.columnDef.header, header.getContext())"
            />
          </template>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="loading">
        <td :colspan="view.colSpan" class="text-center py-8">
          <v-progress-circular indeterminate size="24" />
        </td>
      </tr>
      <tr v-else-if="view.rows.length === 0">
        <td :colspan="view.colSpan" class="text-center text-medium-emphasis py-6">{{ empty }}</td>
      </tr>
      <tr v-for="row in view.rows" v-else :key="row.id">
        <td v-for="cell in row.getVisibleCells()" :key="cell.id">
          <RenderValue :value="resolveTemplate(cell.column.columnDef.cell, cell.getContext())" />
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<style scoped>
.sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.sort .v-icon {
  opacity: 0;
}
.sort:hover .v-icon,
.sort.active .v-icon {
  opacity: 0.7;
}
</style>
