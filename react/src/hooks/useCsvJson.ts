import { useEffect } from "react"
import { createCsvJson, type CsvJsonOptions } from "@core"
import { useController, useLatest, useStore } from "@/hooks/useStore"

/** CSV/TSV の入力と変換。onConvert は最新の関数を呼ぶ。 */
export function useCsvJson(options: CsvJsonOptions) {
  const onConvert = useLatest(options.onConvert)
  const controller = useController(() =>
    createCsvJson({ ...options, onConvert: (r) => onConvert.current?.(r) }),
  )
  useEffect(() => controller.setColumns(options.columns), [controller, options.columns])
  const state = useStore(controller)
  return { state, controller }
}
