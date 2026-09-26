import { buildShards, createShatterGlass, type Pt } from "./shatter"

/** 多角形の面積 (靴紐公式、符号なし)。 */
function area(poly: Pt[]) {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    s += x1 * y2 - x2 * y1
  }
  return Math.abs(s) / 2
}

describe("buildShards", () => {
  it.each([
    [400, 300, 200, 150],
    [400, 300, 10, 290],
    [640, 200, 600, 20],
  ])("破片が %i×%i の矩形を隙間なく敷き詰める (衝撃点 %i,%i)", (w, h, ix, iy) => {
    const shards = buildShards(w, h, ix, iy, 16, 4, 0.5)
    // スポーク 16 本 × (三角形 1 + 四角形 3)
    expect(shards).toHaveLength(64)
    // 最も外側のリングは境界の 0.999 倍でクランプされる (元実装どおり) ので、
    // 面積の合計は矩形の 0.999² 倍ちょうど。重なりがあれば超え、隙間があれば下回る。
    const total = shards.reduce((s, sh) => s + area(sh.poly), 0)
    expect(total / (w * h)).toBeCloseTo(0.999 * 0.999, 6)
    for (const s of shards) {
      for (const [x, y] of s.poly) {
        expect(x).toBeGreaterThanOrEqual(-1e-6)
        expect(x).toBeLessThanOrEqual(w + 1e-6)
        expect(y).toBeGreaterThanOrEqual(-1e-6)
        expect(y).toBeLessThanOrEqual(h + 1e-6)
      }
    }
  })

  it("スポーク数は 4 の倍数に丸められ、リング数だけ帯ができる", () => {
    expect(buildShards(100, 100, 50, 50, 10, 3, 0)).toHaveLength(12 * 3)
    expect(buildShards(100, 100, 50, 50, 1, 1, 0)).toHaveLength(4)
  })
})

/** jsdom にはレイアウトが無いので root の矩形を固定する。 */
function setup(options: Parameters<typeof createShatterGlass>[1] = {}) {
  const root = document.createElement("div")
  const content = document.createElement("div")
  const overlay = document.createElement("div")
  content.innerHTML = `<p id="page">ページ本体</p>`
  root.append(content, overlay)
  document.body.appendChild(root)
  root.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0 }) as DOMRect
  root.style.color = "red"
  const c = createShatterGlass({ root, content, overlay }, { sound: false, ...options })
  return { root, content, overlay, c }
}

afterEach(() => {
  document.body.innerHTML = ""
})

describe("createShatterGlass", () => {
  it("クリックで砕け、破片ごとに content の複製が入る", () => {
    const onShatter = vi.fn()
    const { content, overlay, c } = setup({ onShatter })
    expect(c.get()).toMatchObject({ shattered: false, impact: null, shardCount: 0 })

    content
      .querySelector("p")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 100, clientY: 150 }))
    expect(onShatter).toHaveBeenCalledTimes(1)
    expect(c.get()).toMatchObject({
      shattered: true,
      impact: { fx: 0.25, fy: 0.5 },
      shardCount: 64,
    })
    expect(content.style.visibility).toBe("hidden")
    expect(overlay.querySelectorAll("[data-shard]")).toHaveLength(64)
    // 複製から id は外す (重複 id を作らない)。
    expect(overlay.querySelectorAll("#page")).toHaveLength(0)
    expect(overlay.querySelectorAll("p")).toHaveLength(64)

    // 砕けている間は再クリックしても何も起きない。
    c.shatterAt(10, 10)
    expect(onShatter).toHaveBeenCalledTimes(1)
  })

  it("破片をドラッグすると移動し、drop で全部が下へ落ち、repair で元に戻る", () => {
    const { content, overlay, c } = setup()
    c.shatterAt(200, 150)
    const shard = overlay.querySelector<HTMLElement>('[data-shard="5"]')!
    shard.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }))
    expect(c.get().dragging).toBe(5)
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 40, clientY: 30 }))
    expect(c.getTransforms()[5]).toEqual({ x: 30, y: 20, rot: 0 })
    expect(shard.parentElement!.style.transform).toContain("translate(30px, 20px)")
    window.dispatchEvent(new MouseEvent("pointerup"))
    expect(c.get().dragging).toBeNull()

    c.drop()
    expect(c.getTransforms().every((t) => t.y > 0)).toBe(true)

    c.repair()
    expect(c.get()).toMatchObject({ shattered: false, impact: null, shardCount: 0 })
    expect(overlay.querySelectorAll("[data-shard]")).toHaveLength(0)
    expect(content.style.visibility).toBe("")
  })

  it("draggable=false なら破片はつかめない", () => {
    const { overlay, c } = setup({ draggable: false })
    c.shatterAt(200, 150)
    const shard = overlay.querySelector<HTMLElement>('[data-shard="0"]')!
    expect(shard.style.pointerEvents).toBe("none")
    shard.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }))
    expect(c.get().dragging).toBeNull()
  })

  it("destroy で要素・リスナー・スタイルを片付け、作りなおせる (StrictMode の二重マウント)", () => {
    const { root, content, overlay, c } = setup()
    const rootCss = "color: red;"
    c.shatterAt(200, 150)
    c.destroy()
    expect(overlay.childNodes).toHaveLength(0)
    expect(root.style.cssText).toBe(rootCss)
    expect(content.style.cssText).toBe("")
    expect(overlay.style.cssText).toBe("")

    // 破棄後のクリックでは砕けない。
    const onShatter = vi.fn()
    const c2 = createShatterGlass({ root, content, overlay }, { sound: false, onShatter })
    content.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 50, clientY: 50 }))
    expect(onShatter).toHaveBeenCalledTimes(1)
    expect(overlay.querySelectorAll("[data-shard]")).toHaveLength(64)
    c2.destroy()
    expect(overlay.childNodes).toHaveLength(0)
  })
})
