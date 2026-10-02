import { createRef } from "react"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { createColumnHelper, createMemorySource, type ColumnSpec } from "@/utils"
import { CsvJsonTextArea, type CsvJsonTextAreaHandle } from "./CsvJsonTextArea"
import { CursorTable } from "./draft/CursorTable"
import { DataTable } from "./DataTable"

const csvColumns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required" },
  { label: "年齢", key: "age", usage: "optional" },
]

type Row = { id: string; name: string; score: number }
const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: `r${i + 1}`,
  name: i % 3 === 0 ? `Alice${i + 1}` : `Bob${i + 1}`,
  score: 12 - i,
}))
const h = createColumnHelper<Row>()
const columns = [
  h.accessor("name", { header: "名前" }),
  h.accessor("score", { header: "点", cell: (i) => `${i.getValue()}点` }),
]

describe("CsvJsonTextArea (MUI)", () => {
  it("入力して変換すると結果、形式を切り替えると作りなおす", () => {
    render(<CsvJsonTextArea columns={csvColumns} />)
    fireEvent.change(screen.getByLabelText("CSV/TSV 入力"), {
      target: { value: "氏名,年齢\n山田,30" },
    })
    fireEvent.click(screen.getByRole("button", { name: "変換" }))
    expect(screen.getByLabelText("変換結果").textContent).toContain('"name": "山田"')
    fireEvent.click(screen.getByLabelText("CSV"))
    expect(screen.getByLabelText("変換結果").textContent).toBe("name,age\r\n山田,30")
  })

  it("エラーは見出しつきで一覧になり、ref から入力と変換を操作できる", () => {
    const ref = createRef<CsvJsonTextAreaHandle>()
    render(<CsvJsonTextArea ref={ref} columns={csvColumns} />)
    act(() => {
      ref.current!.setText("年齢\n30")
      ref.current!.convert()
    })
    expect(screen.getByText("エラーが 1件 あります")).toBeInTheDocument()
    expect(screen.getByText("ヘッダ: 必須項目「氏名」がありません")).toBeInTheDocument()
  })
})

describe("DataTable (MUI)", () => {
  const bodyRows = () => within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row")

  it("ページング・検索・並べ替え・cell の描画", () => {
    render(<DataTable data={rows} columns={columns} initialPageSize={5} />)
    expect(bodyRows()).toHaveLength(5)
    expect(screen.getByText("1–5 / 12件")).toBeInTheDocument()
    expect(screen.getByText("12点")).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText("検索…"), { target: { value: "alice" } })
    expect(bodyRows()).toHaveLength(4)

    fireEvent.click(screen.getByText("点"))
    expect(bodyRows()[0]).toHaveTextContent("Alice10")
  })
})

describe("CursorTable (MUI)", () => {
  it("次へ・前へでページを移動する", async () => {
    const src = createMemorySource({ items: rows, getKey: (r) => r.id })
    render(<CursorTable fetchPage={src.fetchPage} columns={columns} initialPageSize={5} />)
    await screen.findByText("Alice1")
    fireEvent.click(screen.getByRole("button", { name: "次へ" }))
    await screen.findByText("Bob6")
    expect(screen.getByText(/2ページ目/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "前へ" }))
    await waitFor(() => expect(screen.getByText("Alice1")).toBeInTheDocument())
  })
})
