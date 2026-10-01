import { describe, expect, it, vi } from "vitest"
import { createColumnHelper } from "@tanstack/table-core"
import { createDataTable, paginationSummary } from "./table"
import { createCursorPager, fetchAllPages } from "./cursor-pager"
import { createMemorySource } from "./memory-source"

type Item = { id: string; name: string; score: number }
const items: Item[] = Array.from({ length: 23 }, (_, i) => ({
  id: `id${String(i + 1).padStart(2, "0")}`,
  name: i % 2 === 0 ? `Alice${i}` : `Bob${i}`,
  score: (i * 7) % 23,
}))
const h = createColumnHelper<Item>()
const columns = [
  h.accessor("id", { header: "ID" }),
  h.accessor("name", { header: "名前" }),
  h.accessor("score", { header: "点" }),
]

const flush = () => new Promise((r) => setTimeout(r, 0))

describe("createDataTable", () => {
  it("ページング・並べ替え・全体検索が状態としてストアに出る", () => {
    const t = createDataTable({ data: items, columns, initialPageSize: 5 })
    const listener = vi.fn()
    t.subscribe(listener)
    expect(t.table.getRowModel().rows).toHaveLength(5)
    expect(paginationSummary(t.table).label).toBe("1–5 / 23件")

    t.table.nextPage()
    expect(t.get().state.pagination.pageIndex).toBe(1)
    expect(listener).toHaveBeenCalled()

    // 数値列も昇順から並べ始める (sortDescFirst: false)
    t.table.getColumn("score")!.toggleSorting()
    expect(t.get().state.sorting).toEqual([{ id: "score", desc: false }])

    t.setGlobalFilter("bob")
    t.table.setPageIndex(0)
    expect(paginationSummary(t.table).total).toBe(11)
  })

  it("setData で行が入れ替わる", () => {
    const t = createDataTable({ data: items.slice(0, 2), columns })
    t.setData(items.slice(0, 3))
    expect(t.table.getRowModel().rows).toHaveLength(3)
  })
})

describe("createMemorySource + createCursorPager", () => {
  it("カーソルで前後に移動でき、検索で 1 ページ目に戻る", async () => {
    const src = createMemorySource({ items, getKey: (i) => i.id })
    const pager = createCursorPager({ fetchPage: src.fetchPage, pageSize: 10 })
    await flush()
    expect(pager.get().page?.items.map((i) => i.id)[0]).toBe("id01")
    expect(pager.get().hasNext).toBe(true)

    pager.next()
    await flush()
    pager.next()
    await flush()
    expect(pager.get().pageIndex).toBe(2)
    expect(pager.get().page?.items).toHaveLength(3)
    expect(pager.get().hasNext).toBe(false)

    pager.prev()
    await flush()
    expect(pager.get().page?.items[0].id).toBe("id11")

    pager.setSearch("alice")
    await flush()
    expect(pager.get().pageIndex).toBe(0)
    expect(pager.get().page?.items.every((i) => i.name.startsWith("Alice"))).toBe(true)
  })

  it("作成・更新・削除と、全件の分割取得", async () => {
    const src = createMemorySource({ items, getKey: (i) => i.id })
    await src.create({ id: "new", name: "Carol", score: 1 })
    await expect(src.create({ id: "new", name: "x", score: 0 })).rejects.toThrow("既に存在")
    await src.update("new", { id: "new", name: "Carol2", score: 2 })
    await src.remove("id01")
    const all = await fetchAllPages(src.fetchPage, 7)
    expect(all).toHaveLength(23)
    expect(all.find((i) => i.id === "new")?.name).toBe("Carol2")
  })

  it("取得エラーは error に入る", async () => {
    const pager = createCursorPager<Item>({
      fetchPage: () => Promise.reject(new Error("down")),
    })
    await flush()
    expect(pager.get().error).toBe("down")
    expect(pager.get().loading).toBe(false)
  })
})

describe("フリーワード検索", () => {
  type P = { name: string; dept: string; status: "active" | "leave"; salary: number }
  const people: P[] = [
    { name: "山田太郎", dept: "営業部", status: "active", salary: 5200000 },
    { name: "ヤマダ花子", dept: "開発部", status: "leave", salary: 6100000 },
    { name: "Suzuki Ichiro", dept: "営業部", status: "leave", salary: 4800000 },
  ]
  const p = createColumnHelper<P>()
  const cols = [
    p.accessor("name", { header: "氏名" }),
    p.accessor("dept", { header: "部署" }),
    p.accessor("status", {
      header: "状態",
      meta: { searchText: (v) => (v === "active" ? "在籍" : "休職") },
    }),
    p.accessor("salary", { header: "給与" }),
  ]
  const names = (q: string) => {
    const t = createDataTable({ data: people, columns: cols })
    t.setGlobalFilter(q)
    return t.table.getFilteredRowModel().rows.map((r) => r.original.name)
  }

  it("空白区切りの語は AND で、列をまたいで当たる", () => {
    expect(names("営業 休職")).toEqual(["Suzuki Ichiro"])
    expect(names("営業　在籍")).toEqual(["山田太郎"]) // 全角空白も区切り
  })
  it("全角/半角・大文字/小文字・ひらがな/カタカナの違いを無視する", () => {
    expect(names("ＳＵＺＵＫＩ")).toEqual(["Suzuki Ichiro"])
    expect(names("やまだ")).toEqual(["ヤマダ花子"])
    expect(names("ﾔﾏﾀﾞ")).toEqual(["ヤマダ花子"])
  })
  it("meta.searchText は画面の文字で、数値の列も当たる", () => {
    expect(names("在籍")).toEqual(["山田太郎"])
    expect(names("6100000")).toEqual(["ヤマダ花子"])
  })
  it("空白だけなら絞らない", () => {
    expect(names("   ")).toHaveLength(3)
  })
})

describe("行の選択と展開", () => {
  it("enableRowSelection で選べ、全選択は検索で絞った行にだけ効く", () => {
    const t = createDataTable({
      data: items,
      columns,
      getRowId: (x) => x.id,
      enableRowSelection: true,
      getRowCanExpand: () => true,
    })
    t.table.getRow("id01").toggleSelected(true)
    expect(t.get().state.rowSelection).toEqual({ id01: true })
    t.setGlobalFilter("Alice")
    t.table.toggleAllRowsSelected(true)
    expect(Object.keys(t.get().state.rowSelection)).toHaveLength(12)
    t.table.getRow("id02").toggleExpanded()
    expect(t.get().state.expanded).toEqual({ id02: true })
  })
})
