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
