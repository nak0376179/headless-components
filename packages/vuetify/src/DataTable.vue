<script setup lang="ts" generic="T">
// @hc/core の createDataTable (TanStack Table) を Vuetify で描く汎用データテーブル。
import { computed } from "vue"
import { paginationSummary, PAGE_SIZE_OPTIONS, type DataTableColumn } from "@hc/core"
import { useDataTable } from "@hc/vue"
import TableView from "./TableView.vue"

const props = withDefaults(
  defineProps<{
    data: T[]
    columns: DataTableColumn<T>[]
    initialPageSize?: number
    searchPlaceholder?: string
    getRowId?: (row: T, index: number) => string
  }>(),
  { initialPageSize: 10, searchPlaceholder: "検索…", getRowId: undefined },
)

const { table, state } = useDataTable<T>({
  data: () => props.data,
  columns: () => props.columns,
  initialPageSize: props.initialPageSize,
  getRowId: props.getRowId,
})

const summary = computed(() => {
  void state.value
  return paginationSummary(table)
})
const pageCount = computed(() =>
  Math.max(1, Math.ceil(summary.value.total / summary.value.pageSize)),
)
</script>

<template>
  <v-card border flat>
    <div class="pa-4">
      <v-text-field
        :model-value="state.state.globalFilter ?? ''"
        :placeholder="searchPlaceholder"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        @update:model-value="(v: string) => table.setGlobalFilter(v)"
      />
    </div>
    <TableView :table="table" :version="state" />
    <div class="footer">
      <span class="text-body-2 text-medium-emphasis">表示件数:</span>
      <v-select
        :model-value="summary.pageSize"
        :items="PAGE_SIZE_OPTIONS"
        density="compact"
        variant="plain"
        hide-details
        class="size"
        @update:model-value="(n: number) => table.setPageSize(n)"
      />
      <span class="text-body-2">{{ summary.label }}</span>
      <v-pagination
        :model-value="summary.pageIndex + 1"
        :length="pageCount"
        density="compact"
        :total-visible="5"
        @update:model-value="(p: number) => table.setPageIndex(p - 1)"
      />
    </div>
  </v-card>
</template>

<style scoped>
.footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 16px;
  flex-wrap: wrap;
}
.size {
  max-width: 80px;
  flex: none;
}
</style>
