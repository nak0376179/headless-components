import { describe, expect, it } from "vitest"
import { QueryClient } from "@tanstack/query-core"
import { createMemorySource } from "../../data-table/memory-source"
import { createCursorPager } from "./cursor-pager"

type Item = { id: string; name: string; score: number }
const items: Item[] = Array.from({ length: 23 }, (_, i) => ({
  id: `id${String(i + 1).padStart(2, "0")}`,
  name: i % 2 === 0 ? `Alice${i}` : `Bob${i}`,
  score: (i * 7) % 23,
}))

const flush = () => new Promise((r) => setTimeout(r, 0))

describe("createMemorySource + createCursorPager", () => {
  it("カーソルで前後に移動でき、検索で 1 ページ目に戻る", async () => {
    const src = createMemorySource({ items, getKey: (i) => i.id })
    const pager = createCursorPager({ fetchPage: src.fetchPage, pageSize: 10 })
    pager.subscribe(() => {}) // UI と同じく購読すると読み始める
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

  it("「前へ」・前の検索に戻る・同じ鍵の別コントローラはキャッシュから出す (TanStack Query)", async () => {
    const src = createMemorySource({ items, getKey: (i) => i.id })
    let calls = 0
    const fetchPage: typeof src.fetchPage = (req) => (calls++, src.fetchPage(req))
    const queryClient = new QueryClient()
    const make = () => {
      const p = createCursorPager({ fetchPage, pageSize: 10, queryClient, queryKey: ["items"] })
      p.subscribe(() => {})
      return p
    }
    const pager = make()
    await flush()
    pager.next()
    await flush()
    expect(calls).toBe(2)
    pager.prev()
    pager.next() // 一度見たページ
    expect(pager.get().page?.items[0].id).toBe("id11")
    pager.setSearch("alice")
    await flush()
    pager.setSearch("")
    expect(pager.get().page?.items[0].id).toBe("id01") // 待たずに出る
    expect(calls).toBe(3)
    const other = make() // 別の画面で同じ API を開いた
    expect(other.get().page?.items[0].id).toBe("id01")
    await flush()
    expect(calls).toBe(3)
    // 作成・削除のあとは読み直す (invalidateQueries でも同じ)
    await src.remove("id01")
    await queryClient.invalidateQueries({ queryKey: ["items"] })
    await flush()
    expect(pager.get().page?.items[0].id).toBe("id02")
  })

  it("取得エラーは error に入る", async () => {
    const pager = createCursorPager<Item>({
      fetchPage: () => Promise.reject(new Error("down")),
    })
    pager.subscribe(() => {}) // UI と同じく購読すると読み始める
    await flush()
    expect(pager.get().error).toBe("down")
    expect(pager.get().loading).toBe(false)
  })
})
