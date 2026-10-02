import { describe, expect, it, vi } from "vitest"
import { createStore } from "./store"

describe("小さなストア (createStore)", () => {
  it("set で値を差し替え、購読者に知らせる", () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    store.subscribe(listener)
    store.set({ count: 1 })
    expect(store.get()).toEqual({ count: 1 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("set に関数を渡すと、前の値から次の値を作る", () => {
    const store = createStore(1)
    store.set((prev) => prev + 1)
    expect(store.get()).toBe(2)
  })

  it("同じ値を set しても知らせない", () => {
    const store = createStore("あ")
    const listener = vi.fn()
    store.subscribe(listener)
    store.set("あ")
    expect(listener).not.toHaveBeenCalled()
  })

  it("patch は一部のプロパティだけ差し替え、別のオブジェクトにする", () => {
    const store = createStore({ name: "山田", age: 30 })
    const before = store.get()
    store.patch({ age: 31 })
    expect(store.get()).toEqual({ name: "山田", age: 31 })
    expect(store.get()).not.toBe(before)
  })

  it("購読を解除すると、それ以降は知らせない", () => {
    const store = createStore(0)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    store.set(1)
    expect(listener).not.toHaveBeenCalled()
  })
})
