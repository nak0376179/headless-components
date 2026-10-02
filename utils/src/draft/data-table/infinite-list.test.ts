import { describe, expect, it } from "vitest"
import { createInfiniteList, virtualWindow } from "./infinite-list"
import { createMemorySource } from "../../data-table/memory-source"

type Item = { id: string; name: string }
const items: Item[] = Array.from({ length: 230 }, (_, i) => ({
  id: String(i + 1).padStart(3, "0"),
  name: i % 10 === 0 ? `特別${i}` : `普通${i}`,
}))
const flush = () => new Promise((r) => setTimeout(r, 0))

describe("createInfiniteList", () => {
  const source = () =>
    createMemorySource({ items, getKey: (x) => x.id, matches: (x, s) => x.name.includes(s) })

  it("loadMore で後ろに足していき、最後で done になる", async () => {
    const list = createInfiniteList({ fetchPage: source().fetchPage, pageSize: 100 })
    list.subscribe(() => {}) // UI と同じく購読すると読み始める
    await flush()
    expect(list.get().items).toHaveLength(100)
    await list.loadMore()
    await list.loadMore()
    expect(list.get().items).toHaveLength(230)
    expect(list.get().done).toBe(true)
    expect(list.get().pagesLoaded).toBe(3)
    await list.loadMore() // 終わったら何もしない
    expect(list.get().pagesLoaded).toBe(3)
  })

  it("loadMore を連打しても 1 回分しか読まない", async () => {
    const list = createInfiniteList({ fetchPage: source().fetchPage, pageSize: 50 })
    list.subscribe(() => {}) // UI と同じく購読すると読み始める
    await flush()
    await Promise.all([list.loadMore(), list.loadMore(), list.loadMore()])
    expect(list.get().items).toHaveLength(100)
  })

  it("検索を変えると最初から読み直し、古い応答は捨てる", async () => {
    const list = createInfiniteList({
      fetchPage: source().fetchPage,
      pageSize: 50,
      searchDebounceMs: 0,
    })
    list.subscribe(() => {}) // UI と同じく購読すると読み始める
    list.setSearch("特別")
    await flush()
    await flush()
    expect(list.get().items.every((x) => x.name.startsWith("特別"))).toBe(true)
    expect(list.get().items).toHaveLength(23)
    expect(list.get().done).toBe(true)
  })
})

describe("virtualWindow", () => {
  it("見えている行 ± overscan だけを描き、上下は詰め物にする", () => {
    const w = virtualWindow({
      scrollTop: 3600,
      viewportHeight: 400,
      rowHeight: 36,
      count: 10000,
      overscan: 5,
    })
    // 先頭に見えているのは 100 行目、画面に 12 行
    expect(w).toEqual({
      start: 95,
      end: 117,
      padTop: 95 * 36,
      padBottom: (10000 - 117) * 36,
      rowsBelow: 10000 - 112,
    })
  })
  it("端では範囲を詰める", () => {
    expect(
      virtualWindow({ scrollTop: 0, viewportHeight: 400, rowHeight: 40, count: 5 }),
    ).toMatchObject({
      start: 0,
      end: 5,
      padTop: 0,
      padBottom: 0,
    })
  })
})
