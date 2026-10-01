import { toValue, watch, type MaybeRefOrGetter } from "vue"
import { createCsvJson, type ColumnSpec, type CsvJsonOptions } from "@core"
import { useStore } from "@/composables/useStore"

export interface UseCsvJsonOptions extends Omit<CsvJsonOptions, "columns"> {
  columns: MaybeRefOrGetter<ColumnSpec[]>
}

/** CSV/TSV の入力と変換。columns は ref / getter でもよい (変われば追従する)。 */
export function useCsvJson(options: UseCsvJsonOptions) {
  const controller = createCsvJson({ ...options, columns: toValue(options.columns) })
  watch(
    () => toValue(options.columns),
    (columns) => controller.setColumns(columns),
  )
  const state = useStore(controller)
  return { state, controller }
}
