import { useRef, type ChangeEvent } from "react"
import { Button } from "@mui/material"
import { CsvJsonTextArea, type CsvJsonTextAreaHandle } from "@hc/mui"
import { columns } from "./columns"

// ref で外から流し込んで変換する (ファイル読み込み・サンプル投入など)。
export function ImportFromFile() {
  const area = useRef<CsvJsonTextAreaHandle>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    area.current?.setText(await file.text())
    area.current?.convert()
  }

  return (
    <>
      <Button component="label" variant="outlined">
        CSV / TSV ファイルを選ぶ
        <input hidden type="file" accept=".csv,.tsv,.txt" onChange={(e) => void onFile(e)} />
      </Button>
      <CsvJsonTextArea ref={area} columns={columns} />
    </>
  )
}
