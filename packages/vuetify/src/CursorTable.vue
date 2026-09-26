<script setup lang="ts" generic="T">
// カーソル方式のサーバーページネーション (Vuetify)。検索・件数変更は 1 ページ目からやり直す。
import { computed } from "vue"
import type { CursorPagerState, DataTableColumn, FetchPage } from "@hc/core"
import { useCursorPager, useDataTable } from "@hc/vue"
import TableView from "./TableView.vue"

const props = withDefaults(
  defineProps<{
    fetchPage: FetchPage<T>
    columns: DataTableColumn<T>[]
    getRowId?: (row: T, index: number) => string
    pageSizeOptions?: number[]
    initialPageSize?: number
    searchPlaceholder?: string
    /** ページ下部の左側に出す文言。既定は「Nページ目 — 返却N件」。 */
    statusText?: (state: CursorPagerState<T>) => string
  }>(),
  {
    getRowId: undefined,
    pageSizeOptions: () => [5, 10, 25],
    initialPageSize: 10,
    searchPlaceholder: "検索…",
    statusText: undefined,
  },
)

const { state, controller } = useCursorPager<T>({
  fetchPage: props.fetchPage,
  pageSize: props.initialPageSize,
})
const items = computed(() => state.value.page?.items ?? [])
const { table, state: tableState } = useDataTable<T>({
  data: items,
  columns: () => props.columns,
  getRowId: props.getRowId,
  manual: true,
})

const status = computed(() => {
  const s = state.value
  if (props.statusText) return props.statusText(s)
  return s.page
    ? `${s.pageIndex + 1}ページ目 — 返却${s.page.count ?? s.page.items.length}件${s.loading ? " · 更新中…" : ""}`
    : ""
})

/** reload() などを外から呼ぶため。 */
defineExpose({ controller })
</script>

<template>
  <v-alert v-if="state.error" type="error" variant="tonal">
    <pre class="error">{{ state.error }}</pre>
    <template #append>
      <v-btn size="small" variant="text" @click="controller.reload()">再試行</v-btn>
    </template>
  </v-alert>
  <v-card v-else border flat>
    <div class="toolbar">
      <v-text-field
        :model-value="state.search"
        :placeholder="searchPlaceholder"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        @update:model-value="(v: string) => controller.setSearch(v)"
      />
      <v-select
        :model-value="state.pageSize"
        :items="pageSizeOptions.map((n) => ({ title: `${n}件/ページ`, value: n }))"
        density="compact"
        variant="outlined"
        hide-details
        class="size"
        @update:model-value="(n: number) => controller.setPageSize(n)"
      />
    </div>
    <TableView :table="table" :version="tableState" :loading="!state.page" />
    <div class="footer">
      <span class="text-body-2 text-medium-emphasis">{{ status }}</span>
      <div>
        <v-btn
          variant="text"
          prepend-icon="mdi-chevron-left"
          :disabled="!state.hasPrev || state.loading"
          @click="controller.prev()"
        >
          前へ
        </v-btn>
        <v-btn
          variant="text"
          append-icon="mdi-chevron-right"
          :disabled="!state.hasNext || state.loading"
          @click="controller.next()"
        >
          次へ
        </v-btn>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 16px;
  padding: 16px;
}
.size {
  max-width: 150px;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
}
.error {
  margin: 0;
  white-space: pre-wrap;
  font-size: 13px;
}
</style>
