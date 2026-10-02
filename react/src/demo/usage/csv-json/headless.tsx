import {
  csvJsonErrorHeading,
  csvJsonResultHeading,
  OUTPUT_FORMATS,
  type OutputFormat,
} from "@/utils"
import { useCsvJson } from "@/hooks/useCsvJson"
import { columns } from "./columns"

// 見た目を自前で作る。状態 (入力・形式・結果) と操作はフックが持ち、ここは描くだけ。
export function MyImporter() {
  const { state, controller } = useCsvJson({ columns })
  const result = state.result // まだ変換していなければ null

  return (
    <div>
      <textarea value={state.text} onChange={(e) => controller.setText(e.target.value)} />
      <select
        value={state.format}
        onChange={(e) => controller.setFormat(e.target.value as OutputFormat)}
      >
        {OUTPUT_FORMATS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <button onClick={() => controller.convert()}>変換</button>

      {result && !result.ok && (
        <>
          <p>{csvJsonErrorHeading(result.errors)}</p>
          <ul>
            {result.errors.map((e) => (
              <li key={e.message}>{e.message}</li>
            ))}
          </ul>
        </>
      )}
      {result?.ok && (
        <>
          <p>{csvJsonResultHeading(result.rows.length, state.format)}</p>
          <pre>{result.output}</pre>
          <button onClick={() => void controller.copyOutput()}>コピー</button>
        </>
      )}
    </div>
  )
}
