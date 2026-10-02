"use client" // Next.js (App Router) で使うときに要る。Vite などの React では無くてよい
import { useState, useSyncExternalStore } from "react"
import { createCsvJson, csvJsonErrorHeading, csvJsonPlaceholder, OUTPUT_FORMATS } from "@/utils"
import { columns } from "./columns"

// utils だけで作る CSV/TSV の取り込み画面 (React / Next.js)。UI ライブラリは使わない。
// 状態は createCsvJson が持つので、React は useSyncExternalStore で購読して描くだけ。
export function CsvImport() {
  const [csv] = useState(() => createCsvJson({ columns }))
  const { text, format, result } = useSyncExternalStore(csv.subscribe, csv.get, csv.get)

  return (
    <div>
      <textarea
        rows={8}
        cols={80}
        value={text}
        placeholder={csvJsonPlaceholder(columns)}
        onChange={(e) => csv.setText(e.target.value)}
      />
      <div>
        {OUTPUT_FORMATS.map((f) => (
          <label key={f.value}>
            <input
              type="radio"
              checked={format === f.value}
              onChange={() => csv.setFormat(f.value)}
            />
            {f.label}
          </label>
        ))}
        <button onClick={() => csv.convert()}>変換</button>
      </div>
      {result && !result.ok && (
        <div role="alert">
          <p>{csvJsonErrorHeading(result.errors)}</p>
          <ul>
            {result.errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
      {result?.ok && <pre>{result.output}</pre>}
    </div>
  )
}
