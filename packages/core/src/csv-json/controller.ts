// CSV/TSV 変換 UI の状態 (入力テキスト・出力形式・変換結果) を持つヘッドレスなコントローラ。
// MUI / Vuetify などの見た目はこの状態を描くだけにし、振る舞いはここに集める。
import { createStore, type ReadableStore } from "../store"
import {
  convertDelimitedText,
  MAX_ERRORS,
  type ColumnSpec,
  type ConvertError,
  type ConvertResult,
  type OutputFormat,
} from "./convert"

export interface CsvJsonState {
  text: string
  format: OutputFormat
  /** まだ一度も変換していなければ null。 */
  result: ConvertResult | null
}

export interface CsvJsonOptions {
  columns: ColumnSpec[]
  text?: string
  format?: OutputFormat
  /** 変換のたびに呼ばれる。 */
  onConvert?: (result: ConvertResult) => void
}

export interface CsvJsonController extends ReadableStore<CsvJsonState> {
  setText(text: string): void
  /** 変換済みなら、切り替えた形式で出力を作りなおす。 */
  setFormat(format: OutputFormat): void
  setColumns(columns: ColumnSpec[]): void
  convert(): ConvertResult
  /** 変換結果をクリップボードへ。成功したら true。 */
  copyOutput(): Promise<boolean>
  readonly columns: ColumnSpec[]
}

export function createCsvJson(options: CsvJsonOptions): CsvJsonController {
  let columns = options.columns
  const store = createStore<CsvJsonState>({
    text: options.text ?? "",
    format: options.format ?? "json",
    result: null,
  })

  const convert = () => {
    const { text, format } = store.get()
    const result = convertDelimitedText(text, columns, format)
    store.patch({ result })
    options.onConvert?.(result)
    return result
  }

  return {
    get: store.get,
    subscribe: store.subscribe,
    get columns() {
      return columns
    },
    setText: (text) => store.patch({ text }),
    setFormat(format) {
      if (format === store.get().format) return
      store.patch({ format })
      if (store.get().result) convert()
    },
    setColumns(next) {
      columns = next
      if (store.get().result) convert()
    },
    convert,
    async copyOutput() {
      const { result } = store.get()
      if (!result?.ok) return false
      try {
        await navigator.clipboard.writeText(result.output)
        return true
      } catch {
        return false
      }
    },
  }
}

/** テキストエリアのプレースホルダ (列定義の項目名を例として並べる)。 */
export const csvJsonPlaceholder = (columns: ColumnSpec[]): string =>
  "ここに CSV / TSV を貼り付けてください（1行目はヘッダ）\n例: " +
  columns.map((c) => c.label).join(", ")

/** エラー一覧の見出し。上限で打ち切ったときは「N件以上」。 */
export const csvJsonErrorHeading = (errors: ConvertError[]): string =>
  `エラーが ${errors.length}${errors.length >= MAX_ERRORS ? "件以上" : "件"} あります`

/** 変換結果の見出し。 */
export const csvJsonResultHeading = (rowCount: number, format: OutputFormat): string =>
  `変換結果（${rowCount}件・${format.toUpperCase()}）`

export const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: "json", label: "JSON" },
  { value: "csv", label: "CSV" },
  { value: "tsv", label: "TSV" },
]
