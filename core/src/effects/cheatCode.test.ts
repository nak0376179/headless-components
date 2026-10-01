import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  advanceCheatProgress,
  CHEAT_SEQUENCE,
  createCheatCode,
  type CheatCodeController,
  type CheatCodeOptions,
} from "./cheatCode"

/** 正規シーケンスを window に打ち込む。 */
function typeKeys(keys: readonly string[] = CHEAT_SEQUENCE) {
  for (const key of keys) window.dispatchEvent(new KeyboardEvent("keydown", { key }))
}

let root: HTMLDivElement
let content: HTMLDivElement
let overlay: HTMLDivElement
let controller: CheatCodeController | null = null

const mount = (options: CheatCodeOptions = {}) => {
  controller = createCheatCode({ root, content, overlay }, { sound: false, ...options })
  return controller
}

beforeEach(() => {
  root = document.createElement("div")
  content = document.createElement("div")
  content.innerHTML = "<p>ページ本体</p>"
  overlay = document.createElement("div")
  root.append(content, overlay)
  document.body.appendChild(root)
})

afterEach(() => {
  controller?.destroy()
  controller = null
  root.remove()
  vi.useRealTimers()
})

describe("advanceCheatProgress", () => {
  const wanted = CHEAT_SEQUENCE.map((k) => k.toLowerCase())

  it("一致すれば 1 つ進む", () => {
    expect(advanceCheatProgress(wanted, 0, "arrowup")).toBe(1)
    expect(advanceCheatProgress(wanted, 8, "b")).toBe(9)
  })

  it("間違えたキーは 0 に戻す", () => {
    expect(advanceCheatProgress(wanted, 3, "x")).toBe(0)
  })

  it("末尾が先頭と重なっていればそこから続ける", () => {
    // ↑ ↑ のあとに ↑ → 最後の ↑ ↑ を先頭とみなして 2
    expect(advanceCheatProgress(wanted, 2, "arrowup")).toBe(2)
    // ↑ ↑ ↓ のあとに ↑ → 1
    expect(advanceCheatProgress(wanted, 3, "arrowup")).toBe(1)
  })
})

describe("createCheatCode", () => {
  it("コード入力で解除され、onUnlock が呼ばれ、Esc で閉じる", () => {
    const onUnlock = vi.fn()
    const c = mount({ onUnlock, confetti: false })
    const listener = vi.fn()
    c.subscribe(listener)

    typeKeys(CHEAT_SEQUENCE.slice(0, 4))
    expect(c.get()).toMatchObject({ unlocked: false, progress: 4, length: 10 })

    typeKeys(CHEAT_SEQUENCE.slice(4))
    expect(c.get()).toMatchObject({ unlocked: true, progress: 0 })
    expect(onUnlock).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalled()
    // きらめきは content に当たり、中身には触らない
    expect(content.style.animation).toContain("hc-cheat-shimmer")
    expect(content.innerHTML).toBe("<p>ページ本体</p>")

    typeKeys(["Escape"])
    expect(c.get().unlocked).toBe(false)
    expect(content.style.animation).toBe("")
  })

  it("大文字の B A でも解除できる", () => {
    const c = mount({ confetti: false })
    typeKeys([...CHEAT_SEQUENCE.slice(0, 8), "B", "A"])
    expect(c.get().unlocked).toBe(true)
  })

  it("途中で間違えるとリセットされる", () => {
    const c = mount({ confetti: false })
    typeKeys(["ArrowUp", "x"])
    expect(c.get().progress).toBe(0)
    typeKeys(CHEAT_SEQUENCE.slice(1)) // 先頭抜きでは完成しない
    expect(c.get().unlocked).toBe(false)
  })

  it("余分な ↑ を挟んでも (部分的な重なり) 完成できる", () => {
    const c = mount({ confetti: false })
    typeKeys(["ArrowUp", ...CHEAT_SEQUENCE])
    expect(c.get().unlocked).toBe(true)
  })

  it("sticky でなければ 2 回目で閉じ、sticky なら解除したまま", () => {
    const c = mount({ confetti: false })
    typeKeys()
    typeKeys()
    expect(c.get().unlocked).toBe(false)

    c.setOptions({ confetti: false, sound: false, sticky: true })
    typeKeys()
    typeKeys()
    expect(c.get().unlocked).toBe(true)
  })

  it("code を差し替えられ、差し替えると進み具合はリセットされる", () => {
    const c = mount({ confetti: false, code: ["x", "y"] })
    typeKeys(["x"])
    expect(c.get().progress).toBe(1)
    c.setOptions({ confetti: false, sound: false, code: ["h", "i", "!"] })
    expect(c.get()).toMatchObject({ progress: 0, length: 3 })
    typeKeys(["h", "i", "!"])
    expect(c.get().unlocked).toBe(true)
  })

  it("紙吹雪を overlay に生やし、時間が経つと片付ける", () => {
    vi.useFakeTimers()
    const c = mount()
    expect(overlay.style.position).toBe("fixed")
    c.trigger()
    expect(overlay.children).toHaveLength(80)
    expect(c.get().bursting).toBe(true)
    vi.advanceTimersByTime(4200)
    expect(overlay.children).toHaveLength(0)
    expect(c.get().bursting).toBe(false)
  })

  it("destroy でリスナー・タイマー・ノード・スタイルを片付ける", () => {
    vi.useFakeTimers()
    const onUnlock = vi.fn()
    const c = mount({ onUnlock })
    expect(root.querySelector("style")).not.toBeNull()
    c.trigger()
    expect(overlay.children.length).toBeGreaterThan(0)
    onUnlock.mockClear()

    c.destroy()
    controller = null
    expect(overlay.children).toHaveLength(0)
    expect(overlay.getAttribute("style")).toBeNull()
    expect(root.querySelector("style")).toBeNull()
    expect(content.style.animation).toBe("")
    expect(vi.getTimerCount()).toBe(0)

    typeKeys()
    expect(onUnlock).not.toHaveBeenCalled()
  })

  it("作る → 壊す → 作る (StrictMode の二重マウント) でも 1 回だけ反応する", () => {
    const onUnlock = vi.fn()
    mount({ onUnlock, confetti: false }).destroy()
    const c = mount({ onUnlock, confetti: false })
    typeKeys()
    expect(onUnlock).toHaveBeenCalledTimes(1)
    expect(c.get().unlocked).toBe(true)
    expect(root.querySelectorAll("style")).toHaveLength(1)
  })
})
