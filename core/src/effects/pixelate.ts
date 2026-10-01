// Pixelate — 包んだページ全体を SVG のモザイクフィルタで描き、ポインター下だけ
// 円形の「曇り取り」レンズで鮮明な元の表示を見せる演出のヘッドレスなコントローラ。
//
// ラスタライズも canvas も不要: モザイクはライブ DOM にかけた本物の CSS `filter: url(#…)`、
// レンズは同じ中身をもう 1 つ描いた要素 (lens) を円形にクリップしたもの。
// ライブ DOM なので、レンズ越しに下のページを操作できる。
//
// UI 側 (React / Vue) は root の中に content (中身) と lens (中身のコピー) を描いて渡すだけ。
// フィルタの生成・ポインター追跡・レンズ/露出の切り替えはすべてここで行う。
import { createStore, type ReadableStore } from "../store"

/** ブロックサイズのスライダーの範囲 (px)。 */
export const PIXELATE_MIN_SIZE = 4
export const PIXELATE_MAX_SIZE = 40

export interface PixelateElements {
  /** ポインターを追う外枠。position: relative にして、レンズの基準にする。 */
  root: HTMLElement
  /** モザイクをかける中身 (ベースレイヤー)。 */
  content: HTMLElement
  /** 中身のコピーを持つレイヤー。ポインター下の円にクリップして鮮明に見せる。 */
  lens: HTMLElement
}

export interface PixelateOptions {
  /** モザイクのブロックサイズ（px）。大きいほど粗くなる。@default 14 */
  size?: number
  /** ポインター下に鮮明な円を露わにする。@default true */
  lens?: boolean
  /** 露出レンズの半径（px）。@default 90 */
  lensRadius?: number
}

export interface PixelateState {
  /** 現在のブロックサイズ（px）。 */
  size: number
  /** 全体を露わにしている (モザイク解除中) か。 */
  revealed: boolean
  /** レンズを表示しているか (ポインターが乗っていて、レンズ有効で、未露出のとき)。 */
  lensVisible: boolean
}

export interface PixelateController extends ReadableStore<PixelateState> {
  /** SVG フィルタの id (インスタンスごとに一意)。 */
  readonly filterId: string
  /** レンズ中心 (root ローカル座標, px)。ポインターが離れているときは null。 */
  readonly lensPos: { x: number; y: number } | null
  setSize(size: number): void
  setRevealed(revealed: boolean): void
  toggleRevealed(): void
  setLensEnabled(enabled: boolean): void
  setLensRadius(radius: number): void
  /** 作ったノード・リスナーをすべて外し、書き換えたスタイルを元に戻す。 */
  destroy(): void
}

const SVG_NS = "http://www.w3.org/2000/svg"
let seq = 0

export function createPixelate(
  { root, content, lens }: PixelateElements,
  options: PixelateOptions = {},
): PixelateController {
  // React の useId の代わりに、コア側で一意な id を振る。
  const filterId = `hc-pixelate-${++seq}`
  let lensEnabled = options.lens ?? true
  let lensRadius = options.lensRadius ?? 90
  let lensPos: { x: number; y: number } | null = null
  let destroyed = false

  const store = createStore<PixelateState>({
    size: options.size ?? 14,
    revealed: false,
    lensVisible: false,
  })

  // destroy で戻すため、触る要素のスタイルを丸ごと控えておく。
  const saved = [root, content, lens].map((el) => [el, el.style.cssText] as const)

  root.style.position = "relative"
  root.style.isolation = "isolate"
  lens.style.position = "absolute"
  lens.style.inset = "0"

  // ---------------------------------------------------------------- モザイクフィルタ
  // feFlood がセルごとに 1 色をサンプリングし、feTile がセルのグリッドを繰り返し、
  // composite がソースの形にマスクし、feMorphology が各サンプルをブロック全体に広げる。
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("width", "0")
  svg.setAttribute("height", "0")
  svg.setAttribute("aria-hidden", "true")
  svg.style.position = "absolute"
  const defs = document.createElementNS(SVG_NS, "defs")
  const filter = document.createElementNS(SVG_NS, "filter")
  filter.setAttribute("id", filterId)
  for (const [k, v] of [
    ["x", "0"],
    ["y", "0"],
    ["width", "100%"],
    ["height", "100%"],
  ]) {
    filter.setAttribute(k, v)
  }
  const flood = document.createElementNS(SVG_NS, "feFlood")
  flood.setAttribute("width", "1")
  flood.setAttribute("height", "1")
  const cell = document.createElementNS(SVG_NS, "feComposite")
  const tile = document.createElementNS(SVG_NS, "feTile")
  tile.setAttribute("result", "cells")
  const mask = document.createElementNS(SVG_NS, "feComposite")
  mask.setAttribute("in", "SourceGraphic")
  mask.setAttribute("in2", "cells")
  mask.setAttribute("operator", "in")
  const dilate = document.createElementNS(SVG_NS, "feMorphology")
  dilate.setAttribute("operator", "dilate")
  filter.append(flood, cell, tile, mask, dilate)
  defs.append(filter)
  svg.append(defs)
  root.prepend(svg)

  /** ブロックサイズが変わるたびにフィルタの属性を作りなおす。 */
  const applySize = (px: number) => {
    const half = String(px / 2)
    flood.setAttribute("x", half)
    flood.setAttribute("y", half)
    cell.setAttribute("width", String(px))
    cell.setAttribute("height", String(px))
    dilate.setAttribute("radius", half)
  }

  // ---------------------------------------------------------------- レンズの輪
  // レンズらしく見えるよう、周囲にうっすらとした輪を描く。
  // クリップの外側に出る影なので、lens の中ではなく root 直下に置く (クリップされないように)。
  const ring = document.createElement("div")
  ring.setAttribute("aria-hidden", "true")
  Object.assign(ring.style, {
    position: "absolute",
    borderRadius: "50%",
    boxShadow: "0 0 0 2px rgba(255,255,255,0.8), 0 4px 18px rgba(0,0,0,0.35)",
    pointerEvents: "none",
    display: "none",
  })
  lens.after(ring)

  // ---------------------------------------------------------------- 描画反映
  const render = () => {
    const { size, revealed } = store.get()
    applySize(size)

    // ベースレイヤー: ページ全体をモザイク化（完全露出時を除く）。
    // モザイク化したコピーは背景にすぎない。クリックは上にある鮮明なコピーへ渡るので、
    // レンズ越しに実際のページを操作できる。
    content.style.filter = revealed ? "" : `url(#${filterId})`
    content.style.pointerEvents = revealed ? "auto" : "none"
    content.style.userSelect = revealed ? "auto" : "none"

    // レンズレイヤー: ポインター下の円形にクリップした鮮明なコピー。
    const lensVisible = lensEnabled && !revealed && lensPos !== null
    if (lensVisible && lensPos) {
      const clip = `circle(${lensRadius}px at ${lensPos.x}px ${lensPos.y}px)`
      lens.style.clipPath = clip
      lens.style.setProperty("-webkit-clip-path", clip)
      lens.style.display = ""
      Object.assign(ring.style, {
        display: "",
        left: `${lensPos.x - lensRadius}px`,
        top: `${lensPos.y - lensRadius}px`,
        width: `${lensRadius * 2}px`,
        height: `${lensRadius * 2}px`,
      })
    } else {
      lens.style.display = "none"
      ring.style.display = "none"
    }
    if (store.get().lensVisible !== lensVisible) store.patch({ lensVisible })
  }

  // ---------------------------------------------------------------- ポインター追跡
  const onMove = (e: PointerEvent) => {
    if (!lensEnabled || store.get().revealed) return
    const r = root.getBoundingClientRect()
    lensPos = { x: e.clientX - r.left, y: e.clientY - r.top }
    render()
  }
  const onLeave = () => {
    lensPos = null
    render()
  }
  root.addEventListener("pointermove", onMove)
  root.addEventListener("pointerleave", onLeave)

  const setRevealed = (revealed: boolean) => {
    if (destroyed) return
    store.patch({ revealed })
    render()
  }

  render()

  return {
    get: store.get,
    subscribe: store.subscribe,
    filterId,
    get lensPos() {
      return lensPos
    },
    setSize(size) {
      if (destroyed) return
      store.patch({ size })
      render()
    },
    setRevealed,
    // this に頼らず、メソッドを切り離して渡しても動くようにする。
    toggleRevealed: () => setRevealed(!store.get().revealed),
    setLensEnabled(enabled) {
      if (destroyed) return
      lensEnabled = enabled
      render()
    },
    setLensRadius(radius) {
      if (destroyed) return
      lensRadius = radius
      render()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerleave", onLeave)
      svg.remove()
      ring.remove()
      for (const [el, css] of saved) el.style.cssText = css
    },
  }
}
