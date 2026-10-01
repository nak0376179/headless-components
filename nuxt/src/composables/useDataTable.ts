import { toValue, watch, type MaybeRefOrGetter } from "vue"
import { createDataTable, type DataTableColumn, type DataTableOptions } from "@core"
import { useStore } from "@/composables/useStore"

export interface UseDataTableOptions<T> extends Omit<DataTableOptions<T>, "data" | "columns"> {
  data: MaybeRefOrGetter<T[]>
  columns: MaybeRefOrGetter<DataTableColumn<T>[]>
}

/**
 * TanStack Table を包んだデータテーブル。
 * ⚠ table 自体はリアクティブではない。テンプレートで table を読む箇所は state を読んで依存を作る。
 */
export function useDataTable<T>(options: UseDataTableOptions<T>) {
  const controller = createDataTable({
    ...options,
    data: toValue(options.data),
    columns: toValue(options.columns),
  })
  watch(
    () => toValue(options.data),
    (data) => controller.setData(data),
  )
  watch(
    () => toValue(options.columns),
    (columns) => controller.setColumns(columns),
  )
  const state = useStore(controller)
  return { table: controller.table, state, controller }
}
