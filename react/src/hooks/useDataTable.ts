import { useLayoutEffect } from "react"
import { createDataTable, type DataTableOptions } from "@/utils"
import { useController, useStore } from "@/hooks/useStore"

/**
 * TanStack Table を包んだデータテーブル。
 * ⚠ data は描画のたびに新しい配列にしないこと (useMemo で包む)。setData → 再描画が止まらなくなる。
 */
export function useDataTable<T>(options: DataTableOptions<T>) {
  const controller = useController(() => createDataTable(options))
  // data / columns の差し替えは描画後に反映する (描画中にストアを書き換えないため)。
  useLayoutEffect(() => controller.setData(options.data), [controller, options.data])
  useLayoutEffect(() => controller.setColumns(options.columns), [controller, options.columns])
  const state = useStore(controller)
  return { table: controller.table, state, controller }
}
