// TanStack Table のフレームワーク非依存版 (@tanstack/table-core) を包んだヘッドレスなテーブル。
// 並べ替え・全体検索・ページングの状態をここで持ち、MUI / Vuetify 側は table を描くだけにする。
import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type Table,
  type TableOptionsResolved,
  type TableState,
  type Updater,
} from "@tanstack/table-core"
import { createStore, type ReadableStore } from "../store"
import { freeWordFilter } from "./free-word"

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Table の慣用。列ごとに値の型が違うため any が要る。
export type DataTableColumn<T> = ColumnDef<T, any>

export interface DataTableOptions<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  initialPageSize?: number
  getRowId?: (row: T, index: number) => string
  /**
   * true なら並べ替え・検索・ページングをテーブル側でしない (サーバーが済ませた 1 ページ分を
   * そのまま描く用。列定義と描画だけを共用したいとき)。
   */
  manual?: boolean
}

export interface DataTableSnapshot<T> {
  state: TableState
  data: T[]
  columns: DataTableColumn<T>[]
}

export interface DataTableController<T> extends ReadableStore<DataTableSnapshot<T>> {
  /** TanStack Table 本体。描画側は getHeaderGroups() / getRowModel() などを読む。 */
  readonly table: Table<T>
  setData(data: T[]): void
  setColumns(columns: DataTableColumn<T>[]): void
  setGlobalFilter(value: string): void
}

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]

export function createDataTable<T>(options: DataTableOptions<T>): DataTableController<T> {
  let data = options.data
  let columns = options.columns

  const resolved: TableOptionsResolved<T> = {
    data,
    columns,
    getRowId: options.getRowId,
    state: {},
    onStateChange: () => {},
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // 全体検索はフリーワード検索 (空白区切りの AND・全角半角/かなの違いを無視。→ free-word.ts)。
    globalFilterFn: freeWordFilter as TableOptionsResolved<T>["globalFilterFn"],
    // 既定は「先頭行の値が文字列か数値の列だけ」。行全体で判定するので、値を持つ列なら全部対象にする。
    getColumnCanGlobalFilter: (column) => !!column.accessorFn,
    // TanStack は数値列を降順から並べ始めるが、UI のソート表示は昇順スタート前提なので揃える。
    sortDescFirst: false,
    manualPagination: options.manual,
    manualSorting: options.manual,
    manualFiltering: options.manual,
    enableSorting: !options.manual,
    initialState: { pagination: { pageIndex: 0, pageSize: options.initialPageSize ?? 10 } },
  }
  const table = createTable<T>(resolved)
  const store = createStore<DataTableSnapshot<T>>({
    state: { ...table.initialState },
    data,
    columns,
  })

  const sync = () => {
    table.setOptions((prev) => ({
      ...prev,
      data,
      columns,
      state: store.get().state,
      onStateChange: (updater: Updater<TableState>) => {
        const prevState = store.get().state
        const state = typeof updater === "function" ? updater(prevState) : updater
        store.patch({ state })
        sync()
      },
    }))
  }
  sync()

  return {
    get: store.get,
    subscribe: store.subscribe,
    table,
    setData(next) {
      if (next === data) return
      data = next
      sync()
      store.patch({ data })
    },
    setColumns(next) {
      if (next === columns) return
      columns = next
      sync()
      store.patch({ columns })
    },
    setGlobalFilter: (value) => table.setGlobalFilter(value),
  }
}

/** 列定義の header / cell は「値」か「関数」。関数なら文脈を渡して呼ぶ (flexRender 相当)。 */
export function resolveTemplate<C>(template: unknown, context: C): unknown {
  return typeof template === "function" ? template(context) : template
}

/** 「1–10 / 42件」の表示用。 */
export function paginationSummary<T>(table: Table<T>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const total = table.getFilteredRowModel().rows.length
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min(total, (pageIndex + 1) * pageSize)
  return { pageIndex, pageSize, total, from, to, label: `${from}–${to} / ${total}件` }
}
