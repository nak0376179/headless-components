<script setup lang="ts" generic="T">
// スクロールで続きを読み込むテーブル (Vuetify)。見えている行だけを描く (仮想スクロール) ので、
// 何万件読み込んでも DOM の行数は画面の分 + 少しに収まる (React 版の InfiniteTable と同じ)。
// 読み込みの状態は @core の createInfiniteList、描く範囲の計算は virtualWindow が持つ。
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { resolveTemplate, virtualWindow, type DataTableColumn, type FetchPage } from "@core"
import { useDataTable } from "@/composables/useDataTable"
import { useInfiniteList } from "@/composables/useInfiniteList"
import RenderValue from "./RenderValue"

const props = withDefaults(
  defineProps<{
    /** サーバーページネーションと同じ形 ({ limit, cursor, search } → { items, nextCursor, count? })。 */
    fetchPage: FetchPage<T>
    columns: DataTableColumn<T>[]
    getRowId?: (row: T, index: number) => string
    /** 1 回に取る件数。 */
    pageSize?: number
    /** 1 行の高さ (px)。行は全部この高さにそろえる (仮想スクロールの前提)。 */
    rowHeight?: number
    /** 表の高さ (px)。 */
    height?: number
    /** 下端まで残りこの行数になったら次を読む。 */
    prefetchRows?: number
    searchPlaceholder?: string
  }>(),
  {
    getRowId: undefined,
    pageSize: 100,
    rowHeight: 40,
    height: 480,
    prefetchRows: 30,
    searchPlaceholder: "検索…",
  },
)

const { state, controller } = useInfiniteList<T>({
  fetchPage: props.fetchPage,
  pageSize: props.pageSize,
})
// 並べ替えはサーバーの順のまま (manual)。行の組み立てと列の描画だけ TanStack Table を使う。
const { table, state: tableState } = useDataTable<T>({
  data: () => state.value.items,
  columns: () => props.columns,
  getRowId: props.getRowId,
  manual: true,
})
// table 自体はリアクティブではないので、tableState を読んでから table を読む
const rows = computed(() => {
  void tableState.value
  return table.getRowModel().rows
})
const leaf = computed(() => {
  void tableState.value
  return table.getVisibleLeafColumns()
})
const headerGroups = computed(() => {
  void tableState.value
  return table.getHeaderGroups()
})

const scroller = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewport = ref(props.height)
const query = ref("")

// スクロールのたびに描き直さず、1 フレームに 1 回にまとめる
let raf = 0
const onScroll = () => {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    scrollTop.value = scroller.value?.scrollTop ?? 0
  })
}
let ro: ResizeObserver | undefined
onMounted(() => {
  const el = scroller.value
  if (!el) return
  ro = new ResizeObserver(() => (viewport.value = el.clientHeight))
  ro.observe(el)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
})

const win = computed(() =>
  virtualWindow({
    scrollTop: Math.max(0, scrollTop.value - (props.rowHeight + 1)), // 固定した見出しの分
    viewportHeight: viewport.value,
    rowHeight: props.rowHeight,
    count: rows.value.length,
  }),
)
const visibleRows = computed(() => rows.value.slice(win.value.start, win.value.end))

// 下端が近づいたら (または中身が画面に満たなければ) 続きを読む
watch(
  () => [win.value.rowsBelow, state.value.loading, state.value.done, state.value.error] as const,
  ([below, loading, done, error]) => {
    if (!loading && !done && !error && below < props.prefetchRows) void controller.loadMore()
  },
  { immediate: true },
)

const onSearch = (v: string) => {
  query.value = v
  controller.setSearch(v)
  scroller.value?.scrollTo({ top: 0 })
}
const widthOf = (w: number | string | undefined) => (typeof w === "number" ? `${w}px` : w)
</script>

<template>
  <v-card variant="outlined">
    <div class="pa-4">
      <v-text-field
        :model-value="query"
        :placeholder="searchPlaceholder"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        @update:model-value="onSearch"
      />
    </div>
    <div ref="scroller" class="scroller" :style="{ height: `${height}px` }" @scroll="onScroll">
      <table class="itable">
        <colgroup>
          <col v-for="c in leaf" :key="c.id" :style="{ width: widthOf(c.columnDef.meta?.width) }" />
        </colgroup>
        <thead>
          <tr v-for="g in headerGroups" :key="g.id">
            <th v-for="h in g.headers" :key="h.id" :style="{ height: `${rowHeight}px` }">
              <RenderValue
                v-if="!h.isPlaceholder"
                :value="resolveTemplate(h.column.columnDef.header, h.getContext())"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="win.padTop > 0" aria-hidden="true" :style="{ height: `${win.padTop}px` }">
            <td :colspan="leaf.length" class="pad" />
          </tr>
          <tr v-for="row in visibleRows" :key="row.id" :style="{ height: `${rowHeight}px` }">
            <td v-for="cell in row.getVisibleCells()" :key="cell.id">
              <RenderValue
                :value="resolveTemplate(cell.column.columnDef.cell, cell.getContext())"
              />
            </td>
          </tr>
          <tr v-if="win.padBottom > 0" aria-hidden="true" :style="{ height: `${win.padBottom}px` }">
            <td :colspan="leaf.length" class="pad" />
          </tr>
        </tbody>
      </table>
      <div v-if="state.loading" class="d-flex justify-center align-center ga-2 py-4">
        <v-progress-circular indeterminate size="18" />
        <span class="text-body-2 text-medium-emphasis">読み込み中…</span>
      </div>
      <div
        v-if="!state.loading && state.done && rows.length === 0"
        class="text-center text-body-2 text-medium-emphasis py-8"
      >
        該当するデータがありません
      </div>
    </div>
    <v-alert v-if="state.error" type="error" density="compact" class="ma-2">
      {{ state.error }}
      <template #append>
        <v-btn size="small" variant="text" @click="controller.loadMore()">再試行</v-btn>
      </template>
    </v-alert>
    <div class="px-4 py-2 text-caption text-medium-emphasis border-t">
      <slot name="status" :state="state" :rendered="win.end - win.start">
        読み込み済み {{ rows.length.toLocaleString() }} 件<template v-if="state.done">
          (すべて)</template
        >
        ・ 描いている行 {{ win.end - win.start }}
      </slot>
    </div>
  </v-card>
</template>

<style scoped>
.scroller {
  overflow: auto;
  contain: strict;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.itable {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.itable th {
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
  padding: 0 16px;
  white-space: nowrap;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.itable td {
  padding: 0 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.itable tbody tr:hover td {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.itable td.pad {
  padding: 0;
  border: 0;
}
</style>
