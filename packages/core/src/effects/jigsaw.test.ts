import { afterEach, describe, expect, it, vi } from "vitest"
import { buildJigsawPieces, createJigsaw, jigsawSnapDistance } from "./jigsaw"

// jsdom にはレイアウトが無いので、root の大きさは clientWidth / clientHeight を差し替えて与える。
function mountHost(width = 600, height = 400) {
  const root = document.createElement("div")
  const content = document.createElement("div")
  content.innerHTML = "<p>ページ本体</p>"
  const overlay = document.createElement("div")
  root.append(content, overlay)
  document.body.appendChild(root)
  Object.defineProperty(root, "clientWidth", { configurable: true, value: width })
  Object.defineProperty(root, "clientHeight", { configurable: true, value: height })
  return { root, content, overlay }
}

/** jsdom には PointerEvent が無いことがあるので、座標を持つ MouseEvent で代用する。 */
function pointer(type: string, target: EventTarget, x: number, y: number) {
  target.dispatchEvent(
    new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true }),
  )
}

const clipOf = (overlay: HTMLElement, i: number) =>
  overlay.querySelector<HTMLElement>(`[data-jigsaw-piece="${i}"]`)!.firstElementChild as HTMLElement

afterEach(() => {
  document.body.innerHTML = ""
})

describe("buildJigsawPieces", () => {
  it("rows×cols 枚のピースをセル中心つきで作る", () => {
    const pieces = buildJigsawPieces(600, 400, 4, 6, 1)
    expect(pieces).toHaveLength(24)
    expect(pieces[0]).toMatchObject({ r: 0, c: 0, cx: 50, cy: 50 })
    expect(pieces[23]).toMatchObject({ r: 3, c: 5, cx: 550, cy: 350 })
    for (const p of pieces) {
      expect(p.d.startsWith("M ")).toBe(true)
      expect(p.d.endsWith(" Z")).toBe(true)
    }
  })

  it("同じ seed なら同じ切り方、違う seed なら違う切り方になる", () => {
    const a = buildJigsawPieces(600, 400, 4, 6, 1)
    const b = buildJigsawPieces(600, 400, 4, 6, 1)
    const c = buildJigsawPieces(600, 400, 4, 6, 2)
    expect(a.map((p) => p.d)).toEqual(b.map((p) => p.d))
    expect(a.map((p) => p.d)).not.toEqual(c.map((p) => p.d))
  })

  it("隣り合うピースは同じ境界曲線を共有する (右隣の左辺 = 自分の右辺の逆順)", () => {
    const [p00, p01] = buildJigsawPieces(600, 400, 4, 6, 7)
    const nums = (d: string) => d.match(/-?[\d.e-]+/g)!.map(Number)
    // 上辺(3 セグ) + 右辺(3 セグ) … の順なので、右辺の終点 (100, 100) が p00 に、
    // 左辺の始点 (100, 100) が p01 に現れる。
    expect(nums(p00.d)).toContain(100)
    // 左上ピースの外周は直線の縁 (x=0 / y=0 の辺) を持つ。
    expect(p00.d.startsWith("M 0 0 C 0 0 100 0 100 0")).toBe(true)
    // 右隣ピースの左辺は、左上ピースの右辺と同じ制御点を逆順にたどる。
    const rightOf00 = nums(p00.d).slice(2 + 6, 2 + 6 + 18) // 上辺(直線 1 セグ) の後の右辺 3 セグ
    const leftOf01 = nums(p01.d).slice(-18) // 最後の 3 セグが左辺
    // 右辺の点列 (c1,c2,p ×3) と、左辺を逆向きにした点列が一致する。
    const pts = (a: number[]) =>
      Array.from({ length: a.length / 2 }, (_, k) => `${a[2 * k]},${a[2 * k + 1]}`)
    const r = pts(rightOf00) // [c1,c2,p]×3
    const l = pts(leftOf01)
    // 左辺 (逆向き) の各セグメント k は、右辺のセグメント 2-k の c2,c1 と 1 つ前の終点。
    expect(l[0]).toBe(r[7]) // 逆向き 1 本目の c1 = 右辺 3 本目の c2
    expect(l[1]).toBe(r[6]) // 逆向き 1 本目の c2 = 右辺 3 本目の c1
    expect(l[2]).toBe(r[5]) // 逆向き 1 本目の終点 = 右辺 2 本目の終点
  })

  it("サイズや分割数が 0 なら空", () => {
    expect(buildJigsawPieces(0, 400, 4, 6, 1)).toEqual([])
    expect(buildJigsawPieces(600, 400, 0, 6, 1)).toEqual([])
  })

  it("スナップ距離は最小 30px、セルの短辺の半分", () => {
    expect(jigsawSnapDistance(40, 40)).toBe(30)
    expect(jigsawSnapDistance(100, 80)).toBe(40)
  })
})

describe("createJigsaw", () => {
  it("取り付けると content を隠し、複製をピースとして overlay に並べてばらまく", () => {
    const host = mountHost()
    const c = createJigsaw(host, { rows: 2, cols: 3, sound: false })
    expect(host.root.style.position).toBe("relative")
    expect(host.content.style.visibility).toBe("hidden")
    expect(c.get()).toMatchObject({ width: 600, height: 400, total: 6, placed: 0, solved: false })
    const wraps = host.overlay.querySelectorAll("[data-jigsaw-piece]")
    expect(wraps).toHaveLength(6)
    // 各ピースに内容の複製が入り、複製は非表示にされていない。
    const clone = wraps[0].querySelector("p")!.parentElement as HTMLElement
    expect(clone.textContent).toBe("ページ本体")
    expect(clone.style.visibility).toBe("")
    expect(host.overlay.querySelectorAll("clipPath")).toHaveLength(6)
    c.destroy()
  })

  it("scattered=false なら完成状態で始まり、onSolved が一度だけ呼ばれる", () => {
    const onSolved = vi.fn()
    const c = createJigsaw(mountHost(), {
      rows: 2,
      cols: 2,
      scattered: false,
      sound: false,
      onSolved,
    })
    expect(c.get()).toMatchObject({ total: 4, placed: 4, solved: true })
    expect(onSolved).toHaveBeenCalledTimes(1)
    c.solve()
    expect(onSolved).toHaveBeenCalledTimes(1)
    c.destroy()
  })

  it("shuffle / solve で状態が切り替わり、完成のたびに onSolved が呼ばれる", () => {
    const onSolved = vi.fn()
    const c = createJigsaw(mountHost(), { rows: 2, cols: 3, sound: false, onSolved })
    expect(c.get().solved).toBe(false)
    c.solve()
    expect(c.get()).toMatchObject({ placed: 6, solved: true })
    expect(c.transformOf(0)).toEqual({ x: 0, y: 0, rot: 0 })
    c.shuffle()
    expect(c.get()).toMatchObject({ placed: 0, solved: false })
    c.solve()
    expect(onSolved).toHaveBeenCalledTimes(2)
    c.destroy()
  })

  it("ドラッグで定位置の近くに離すとはまり、遠くで離すとはまらない", () => {
    const host = mountHost()
    const c = createJigsaw(host, { rows: 2, cols: 3, sound: false })
    const t0 = c.transformOf(0)

    // 遠くへ動かして離す → はまらない
    pointer("pointerdown", clipOf(host.overlay, 0), 0, 0)
    expect(c.get().dragging).toBe(0)
    pointer("pointermove", window, 1000, 1000)
    expect(c.get().snapReady).toBe(false)
    pointer("pointerup", window, 1000, 1000)
    expect(c.get()).toMatchObject({ dragging: null, placed: 0 })
    expect(c.transformOf(0)).toEqual({ x: t0.x + 1000, y: t0.y + 1000, rot: 0 })

    // 完成位置のすぐそば (5px) まで動かして離す → カチッとはまる
    const t1 = c.transformOf(0)
    pointer("pointerdown", clipOf(host.overlay, 0), 0, 0)
    pointer("pointermove", window, -t1.x + 5, -t1.y)
    expect(c.get().snapReady).toBe(true)
    pointer("pointerup", window, 0, 0)
    expect(c.get()).toMatchObject({ placed: 1, snapReady: false })
    expect(c.get().locked[0]).toBe(true)
    expect(c.transformOf(0)).toEqual({ x: 0, y: 0, rot: 0 })
    expect(clipOf(host.overlay, 0).style.pointerEvents).toBe("none")

    // 固定済みのピースはもうつかめない
    pointer("pointerdown", clipOf(host.overlay, 0), 0, 0)
    expect(c.get().dragging).toBe(null)
    c.destroy()
  })

  it("draggable=false ならつかめない", () => {
    const host = mountHost()
    const c = createJigsaw(host, { rows: 2, cols: 2, sound: false, draggable: false })
    pointer("pointerdown", clipOf(host.overlay, 0), 0, 0)
    expect(c.get().dragging).toBe(null)
    c.destroy()
  })

  it("サイズが 0 の間はピースを作らない", () => {
    const host = mountHost(0, 0)
    const c = createJigsaw(host, { sound: false })
    expect(c.get()).toMatchObject({ total: 0, solved: false })
    expect(host.overlay.childElementCount).toBe(0)
    c.destroy()
  })

  it("destroy で DOM・リスナー・スタイルをすべて元に戻す (StrictMode の作りなおしにも耐える)", () => {
    const host = mountHost()
    host.content.style.visibility = "visible"
    const add = vi.spyOn(window, "addEventListener")
    const remove = vi.spyOn(window, "removeEventListener")

    const first = createJigsaw(host, { sound: false })
    first.destroy()
    expect(host.overlay.childElementCount).toBe(0)
    expect(host.root.getAttribute("style")).toBe(null)
    expect(host.content.style.visibility).toBe("visible")
    expect(host.content.style.pointerEvents).toBe("")
    const added = add.mock.calls.map((c) => c[0])
    const removed = remove.mock.calls.map((c) => c[0])
    expect(removed).toEqual(expect.arrayContaining(added))

    // 破棄後の操作は何もしない
    first.shuffle()
    expect(host.overlay.childElementCount).toBe(0)

    // create → destroy → create でも正常に動く
    const second = createJigsaw(host, { sound: false })
    expect(second.get().total).toBe(24)
    expect(host.overlay.querySelectorAll("[data-jigsaw-piece]")).toHaveLength(24)
    // 複製は元のインラインスタイル (visibility: visible) を引き継ぐ
    const clone = host.overlay.querySelector("p")!.parentElement as HTMLElement
    expect(clone.style.visibility).toBe("visible")
    second.destroy()
    expect(host.overlay.childElementCount).toBe(0)
    add.mockRestore()
    remove.mockRestore()
  })
})
