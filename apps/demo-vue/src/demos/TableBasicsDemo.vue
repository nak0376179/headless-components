<script setup lang="ts">
// useDataTable (TanStack Table) で、選択・展開・並べ替え・検索・ページングを組む。
// 見た目は Vuetify の v-table を自分で並べる (完成品の DataTable では足りないとき用)。
import { computed, ref } from "vue"
import { createDialogs, paginationSummary, resolveTemplate, PAGE_SIZE_OPTIONS } from "@hc/core"
import { DialogHost, RenderValue } from "@hc/vuetify"
import { useDataTable } from "@hc/vue"
import { formatSalary, generateEmployees, STATUS_LABEL, type Employee } from "@hc/demo-data"
import { employeeColumns } from "./employeeColumns"

const dialogs = createDialogs()
const items = ref<Employee[]>(generateEmployees(120))
const dense = ref(true)
const { table, state } = useDataTable<Employee>({
  data: () => items.value,
  columns: employeeColumns,
  getRowId: (e) => e.email,
  initialPageSize: 10,
  enableRowSelection: (row) => row.original.status !== "retired", // 退職者は選べない
  getRowCanExpand: () => true,
})
// table 自体はリアクティブではないので、state を読んでから table を読む
const view = computed(() => {
  void state.value
  return {
    headerGroups: table.getHeaderGroups(),
    rows: table.getRowModel().rows,
    all: table.getIsAllRowsSelected(),
    some: table.getIsSomeRowsSelected(),
    summary: paginationSummary(table),
    colSpan: table.getVisibleLeafColumns().length + 2,
  }
})
const selected = computed(() => Object.keys(state.value.state.rowSelection ?? {}))
const pageCount = computed(() =>
  Math.max(1, Math.ceil(view.value.summary.total / view.value.summary.pageSize)),
)
const sortIcon = (s: false | "asc" | "desc") =>
  s === "asc" ? "mdi-arrow-up" : s === "desc" ? "mdi-arrow-down" : "mdi-swap-vertical"
const years = (e: Employee) => new Date().getFullYear() - Number(e.joinedAt.slice(0, 4))

const removeSelected = async () => {
  const ok = await dialogs.confirm({
    title: `${selected.value.length} 人を削除しますか？`,
    message: "選んだ行をまとめて削除します。",
    danger: true,
  })
  if (!ok) return
  const gone = new Set(selected.value)
  items.value = items.value.filter((e) => !gone.has(e.email))
  table.resetRowSelection()
}
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <p class="text-body-2 text-medium-emphasis">
      行の選択
      (全選択・一部だけ選んだときの中間表示・退職者は選べない)、行を開いて詳細、見出しの固定、
      並べ替え、フリーワード検索、ページング。状態はすべて useDataTable が持つ。
    </p>
    <v-card variant="outlined">
      <v-toolbar v-if="selected.length > 0" color="primary" density="comfortable">
        <v-toolbar-title>{{ selected.length }} 件選択中</v-toolbar-title>
        <v-btn @click="table.resetRowSelection()">選択を外す</v-btn>
        <v-btn prepend-icon="mdi-delete" @click="removeSelected">削除</v-btn>
      </v-toolbar>
      <div v-else class="d-flex align-center ga-4 pa-4">
        <v-text-field
          :model-value="state.state.globalFilter ?? ''"
          placeholder="フリーワード検索"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          hide-details
          @update:model-value="(v: string) => table.setGlobalFilter(v)"
        />
        <v-switch
          v-model="dense"
          label="詰めて表示"
          color="primary"
          hide-details
          class="flex-grow-0"
        />
      </div>
      <v-table :density="dense ? 'compact' : 'default'" fixed-header height="520">
        <thead>
          <tr v-for="g in view.headerGroups" :key="g.id">
            <th style="width: 48px">
              <v-checkbox-btn
                :model-value="view.all"
                :indeterminate="view.some"
                aria-label="すべて選ぶ"
                @update:model-value="(v: boolean) => table.toggleAllRowsSelected(v)"
              />
            </th>
            <th style="width: 48px" />
            <th v-for="h in g.headers" :key="h.id">
              <button type="button" class="sort" @click="h.column.toggleSorting()">
                <RenderValue :value="resolveTemplate(h.column.columnDef.header, h.getContext())" />
                <v-icon :icon="sortIcon(h.column.getIsSorted())" size="x-small" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in view.rows" :key="row.id">
            <tr :class="{ 'bg-primary-lighten': row.getIsSelected() }">
              <td>
                <v-checkbox-btn
                  :model-value="row.getIsSelected()"
                  :disabled="!row.getCanSelect()"
                  @update:model-value="(v: boolean) => row.toggleSelected(v)"
                />
              </td>
              <td>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  aria-label="詳細"
                  @click="row.toggleExpanded()"
                >
                  <v-icon :icon="row.getIsExpanded() ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
                </v-btn>
              </td>
              <td v-for="cell in row.getVisibleCells()" :key="cell.id">
                <RenderValue
                  :value="resolveTemplate(cell.column.columnDef.cell, cell.getContext())"
                />
              </td>
            </tr>
            <tr v-if="row.getIsExpanded()">
              <td :colspan="view.colSpan">
                <div class="detail">
                  <div><span>メール</span>{{ row.original.email }}</div>
                  <div><span>勤続</span>{{ years(row.original) }} 年</div>
                  <div><span>年収</span>{{ formatSalary(row.original.salary) }}</div>
                  <div>
                    <span>月給 (目安)</span
                    >{{ formatSalary(Math.round(row.original.salary / 12 / 1000) * 1000) }}
                  </div>
                  <div><span>状態</span>{{ STATUS_LABEL[row.original.status] }}</div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </v-table>
      <div class="d-flex align-center justify-end ga-4 pa-2 text-body-2">
        <span>表示件数:</span>
        <v-select
          :model-value="view.summary.pageSize"
          :items="PAGE_SIZE_OPTIONS"
          density="compact"
          variant="plain"
          hide-details
          style="max-width: 80px"
          @update:model-value="(n: number) => table.setPageSize(n)"
        />
        <span>{{ view.summary.label }}</span>
        <v-pagination
          :model-value="view.summary.pageIndex + 1"
          :length="pageCount"
          density="compact"
          total-visible="5"
          @update:model-value="(p: number) => table.setPageIndex(p - 1)"
        />
      </div>
    </v-card>
    <DialogHost :dialogs="dialogs" />
  </div>
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
  cursor: pointer;
}
.bg-primary-lighten td {
  background: rgba(var(--v-theme-primary), 0.08);
}
.detail {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  padding: 16px 8px;
}
.detail span {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
