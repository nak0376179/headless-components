import { h } from "vue"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/vue"
import { describe, expect, it } from "vitest"
import { createVuetify } from "vuetify"
import * as components from "vuetify/components"
import * as directives from "vuetify/directives"
import { createColumnHelper, createMemorySource, type ColumnSpec } from "@hc/core"
import { CsvJsonTextArea, CursorTable, DataTable } from "."

const vuetify = createVuetify({ components, directives })
const global = { plugins: [vuetify] }
// Vuetify のオーバーレイ等は v-app の中で描く必要がある。
const inApp = (component: unknown, props: Record<string, unknown>) =>
  render({ render: () => h(components.VApp, () => h(component as never, props)) }, { global })

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
const c = createColumnHelper<Row>()
const columns = [
  c.accessor("name", { header: "名前" }),
  c.accessor("score", { header: "点", cell: (i) => h("b", `${i.getValue()}点`) }),
]

describe("CsvJsonTextArea (Vuetify)", () => {
  it("入力して変換すると結果、形式を切り替えると作りなおす", async () => {
    inApp(CsvJsonTextArea, { columns: csvColumns })
    await fireEvent.update(screen.getByLabelText("CSV/TSV 入力"), "氏名,年齢\n山田,30")
    await fireEvent.click(screen.getByRole("button", { name: "変換" }))
    expect(screen.getByLabelText("変換結果").textContent).toContain('"name": "山田"')
    await fireEvent.click(screen.getByLabelText("CSV"))
    expect(screen.getByLabelText("変換結果").textContent).toBe("name,age\r\n山田,30")
  })

  it("エラーは見出しつきで一覧になる", async () => {
    inApp(CsvJsonTextArea, { columns: csvColumns, modelValue: "年齢\n30" })
    await fireEvent.click(screen.getByRole("button", { name: "変換" }))
    expect(screen.getByText("エラーが 1件 あります")).toBeInTheDocument()
  })
})

describe("DataTable (Vuetify)", () => {
  const bodyRows = () => within(document.querySelector("tbody")!).getAllByRole("row")

  it("ページング・検索・並べ替え・VNode の cell", async () => {
    inApp(DataTable, { data: rows, columns, initialPageSize: 5 })
    expect(bodyRows()).toHaveLength(5)
    expect(screen.getByText("1–5 / 12件")).toBeInTheDocument()
    expect(screen.getByText("12点").tagName).toBe("B")

    await fireEvent.update(screen.getByPlaceholderText("検索…"), "alice")
    expect(bodyRows()).toHaveLength(4)

    await fireEvent.click(screen.getByText("点"))
    expect(bodyRows()[0]).toHaveTextContent("Alice10")
  })
})

describe("CursorTable (Vuetify)", () => {
  it("次へ・前へでページを移動する", async () => {
    const src = createMemorySource({ items: rows, getKey: (r) => r.id })
    inApp(CursorTable, { fetchPage: src.fetchPage, columns, initialPageSize: 5 })
    await screen.findByText("Alice1")
    await fireEvent.click(screen.getByRole("button", { name: "次へ" }))
    await screen.findByText("Bob6")
    expect(screen.getByText(/2ページ目/)).toBeInTheDocument()
    await fireEvent.click(screen.getByRole("button", { name: "前へ" }))
    await waitFor(() => expect(screen.getByText("Alice1")).toBeInTheDocument())
  })
})
