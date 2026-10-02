import { afterEach, describe, expect, it, vi } from "vitest"
import { createPixelate, type PixelateController } from "./pixelate"

// root > content + lens の構造を作る (ラッパーが描くのと同じ形)。
function setup() {
  const root = document.createElement("div")
  const content = document.createElement("div")
  const lens = document.createElement("div")
  content.innerHTML = "<p>ページ本体</p>"
  lens.innerHTML = "<p>ページ本体</p>"
  root.append(content, lens)
  document.body.append(root)
  // jsdom はレイアウトしないので、root の位置を固定値にする。
  root.getBoundingClientRect = () => ({ left: 10, top: 20 }) as DOMRect
  return { root, content, lens }
}

// jsdom に PointerEvent が無い版もあるので MouseEvent で代用する (clientX/Y だけ使う)。
const move = (el: HTMLElement, x: number, y: number) =>
  el.dispatchEvent(new MouseEvent("pointermove", { clientX: x, clientY: y, bubbles: true }))
const leave = (el: HTMLElement) => el.dispatchEvent(new MouseEvent("pointerleave"))

let controllers: PixelateController[] = []
const create = (...args: Parameters<typeof createPixelate>) => {
  const c = createPixelate(...args)
  controllers.push(c)
  return c
}

afterEach(() => {
  for (const c of controllers) c.destroy()
  controllers = []
  document.body.innerHTML = ""
})

describe("createPixelate", () => {
  it("一意な id の SVG フィルタを作り、中身にかける", () => {
    const els = setup()
    const a = create(els)
    const b = create(setup())
    expect(a.filterId).not.toBe(b.filterId)
    const filter = els.root.querySelector(`filter#${a.filterId}`)
    expect(filter).not.toBeNull()
    expect(els.content.style.filter).toContain(`#${a.filterId}`)
    expect(els.content.style.pointerEvents).toBe("none")
    expect(els.root.style.position).toBe("relative")
    expect(a.get()).toEqual({ size: 14, revealed: false, lensVisible: false })
  })

  it("ブロックサイズをフィルタの属性に反映する", () => {
    const els = setup()
    const c = create(els, { size: 20 })
    const morph = els.root.querySelector("feMorphology")!
    const flood = els.root.querySelector("feFlood")!
    expect(morph.getAttribute("radius")).toBe("10")
    expect(flood.getAttribute("x")).toBe("10")
    c.setSize(8)
    expect(c.get().size).toBe(8)
    expect(morph.getAttribute("radius")).toBe("4")
    expect(els.root.querySelectorAll("feComposite")[0].getAttribute("width")).toBe("8")
  })

  it("ポインター下にレンズを出し、離れると隠す", () => {
    const els = setup()
    const c = create(els, { lensRadius: 50 })
    expect(els.lens.style.display).toBe("none")
    const listener = vi.fn()
    c.subscribe(listener)

    move(els.root, 110, 220)
    expect(c.lensPos).toEqual({ x: 100, y: 200 })
    expect(c.get().lensVisible).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(els.lens.style.display).toBe("")
    expect(els.lens.style.clipPath).toBe("circle(50px at 100px 200px)")

    // 移動だけなら状態 (lensVisible) は変わらないので通知しない。
    move(els.root, 60, 70)
    expect(els.lens.style.clipPath).toBe("circle(50px at 50px 50px)")
    expect(listener).toHaveBeenCalledTimes(1)

    leave(els.root)
    expect(c.lensPos).toBeNull()
    expect(c.get().lensVisible).toBe(false)
    expect(els.lens.style.display).toBe("none")
  })

  it("露出中はモザイクを外し、レンズを出さない", () => {
    const els = setup()
    const c = create(els)
    move(els.root, 50, 50)
    c.toggleRevealed()
    expect(c.get().revealed).toBe(true)
    expect(c.get().lensVisible).toBe(false)
    expect(els.content.style.filter).toBe("")
    expect(els.content.style.pointerEvents).toBe("auto")
    expect(els.lens.style.display).toBe("none")
    c.toggleRevealed()
    expect(els.content.style.filter).toContain(`#${c.filterId}`)
  })

  it("lens=false ならレンズを出さない", () => {
    const els = setup()
    const c = create(els, { lens: false })
    move(els.root, 50, 50)
    expect(c.get().lensVisible).toBe(false)
    c.setLensEnabled(true)
    move(els.root, 50, 50)
    expect(c.get().lensVisible).toBe(true)
  })

  it("destroy で作ったノード・リスナーを外し、スタイルを戻す", () => {
    const els = setup()
    els.lens.style.display = "none"
    const before = [els.root, els.content, els.lens].map((e) => e.style.cssText)
    const c = create(els)
    move(els.root, 50, 50)
    c.destroy()
    expect(els.root.querySelector("svg")).toBeNull()
    expect(els.root.children).toHaveLength(2)
    expect([els.root, els.content, els.lens].map((e) => e.style.cssText)).toEqual(before)
    const listener = vi.fn()
    c.subscribe(listener)
    move(els.root, 80, 80)
    expect(listener).not.toHaveBeenCalled()
  })

  it("作る → 壊す → 作る (StrictMode の二重マウント) でも 1 組だけ残る", () => {
    const els = setup()
    create(els).destroy()
    const c = create(els)
    expect(els.root.querySelectorAll("svg")).toHaveLength(1)
    expect(els.content.style.filter).toContain(`#${c.filterId}`)
    move(els.root, 50, 50)
    expect(c.get().lensVisible).toBe(true)
  })
})
