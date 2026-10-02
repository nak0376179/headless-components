// ShatterGlass — 任意のページを包み、クリックした地点からガラスのように割る演出のヘッドレスなコア。
//
// クリックするまでは完全に普通に見える。クリック地点が衝撃点となり、放射状のひびが外へ走り、
// 表示がガラスの破片に砕け、各破片はドラッグ（そして放り投げ）できるピースになって、
// めくると下にあるものが見える。repair() ですべて元どおりに戻る。
//
// ジオメトリ — 全面を覆う放射状の破砕:
//   衝撃点から放射状にスポークを伸ばす。4 つの角は *必ず* スポークになるので、隣り合う
//   2 本のスポークの間では両端の境界ヒットが同じ矩形の辺に落ちる → 外側の破片が隙間なく
//   ページを端まで敷き詰める。各スポークに沿っていくつかのリング（境界までの距離の割合）を
//   置く。最も内側のリングは衝撃点を中心に三角形へ広がり、外側のリングは四角形を作る。
//   各破片は content をクリップした複製 (cloneNode) なので、組み直せばピクセル単位で元に戻る。
//
// DOM の構成 (React / Vue のラッパーが描く):
//   <div root>                … 基準の箱 (position: relative などはコアが付ける)
//     <div content>…</div>    … 本物のページ。クリックで砕ける。砕けたあとは非表示 (サイズ計算用に残す)
//     <div overlay/>          … 破片・衝撃のフラッシュをコアがここに差し込む
//   </div>
import { createStore, type ReadableStore } from "../../store"

export type Pt = [number, number]

export interface Shard {
  /** root ローカル座標（px）でのポリゴンの頂点。 */
  poly: Pt[]
  /** 重心（transform の原点 + 放り投げる方向の基準）。 */
  cx: number
  cy: number
}

/** 破片 1 枚の移動量。 */
export interface ShardTransform {
  x: number
  y: number
  rot: number
}

export interface ShatterGlassElements {
  root: HTMLElement
  content: HTMLElement
  overlay: HTMLElement
}

export interface ShatterGlassOptions {
  /** 放射状スポークのおおよその本数（4 の倍数に丸められる）。@default 16 */
  spokes?: number
  /** 衝撃点から端までの同心リングの数。@default 4 */
  rings?: number
  /** ひび模様の不規則さ 0–1。@default 0.5 */
  jitter?: number
  /** 砕けたあと破片をドラッグできるようにする。@default true */
  draggable?: boolean
  /** 衝撃時に合成したガラスの割れる音を鳴らす。@default true */
  sound?: boolean
  /** ガラスが砕けたときに発火する。 */
  onShatter?: () => void
}

export interface ShatterGlassState {
  /** 砕けているか (破片が表示されているか)。 */
  shattered: boolean
  /** 衝撃点 (root に対する割合 0–1)。砕けていなければ null。 */
  impact: { fx: number; fy: number } | null
  /** 破片の枚数。 */
  shardCount: number
  /** ドラッグ中の破片の番号。ドラッグしていなければ null。 */
  dragging: number | null
}

export interface ShatterGlassController extends ReadableStore<ShatterGlassState> {
  /** 画面座標 (clientX / clientY) の地点で砕く。すでに砕けていれば何もしない。 */
  shatterAt(clientX: number, clientY: number): void
  /** すべての破片を衝撃点から外へ、重力と回転を付けて放り投げる。 */
  drop(): void
  /** 元どおりに戻す。 */
  repair(): void
  /** 現在の破片 (テスト・デバッグ用)。 */
  getShards(): readonly Shard[]
  /** 現在の各破片の移動量 (テスト・デバッグ用)。 */
  getTransforms(): readonly ShardTransform[]
  /** 付けたリスナー・タイマー・要素・スタイルをすべて片付ける。 */
  destroy(): void
}

// ---------------------------------------------------------------- ジオメトリ

/** 内部の点から矩形の境界へ伸ばしたレイ。当たった点を返す。 */
export function rayToRect(ix: number, iy: number, ang: number, w: number, h: number): Pt {
  const dx = Math.cos(ang)
  const dy = Math.sin(ang)
  let t = Infinity
  if (dx > 1e-9) t = Math.min(t, (w - ix) / dx)
  else if (dx < -1e-9) t = Math.min(t, -ix / dx)
  if (dy > 1e-9) t = Math.min(t, (h - iy) / dy)
  else if (dy < -1e-9) t = Math.min(t, -iy / dy)
  return [ix + dx * t, iy + dy * t]
}

function centroid(poly: Pt[]): { cx: number; cy: number } {
  let x = 0
  let y = 0
  for (const [px, py] of poly) {
    x += px
    y += py
  }
  return { cx: x / poly.length, cy: y / poly.length }
}

/**
 * w×h の矩形を、(ix, iy) を衝撃点とする放射状の破片に分割する。
 * 破片どうしは頂点を共有し、重なりも隙間もなく矩形全体を敷き詰める。
 * random を差し替えると結果を固定できる (テスト用)。
 */
export function buildShards(
  w: number,
  h: number,
  ix: number,
  iy: number,
  spokes: number,
  rings: number,
  jitter: number,
  random: () => number = Math.random,
): Shard[] {
  // 隣り合う境界ヒットが辺を共有するよう、角の角度は必ずスポークにする。
  const corners = [
    Math.atan2(-iy, -ix), // 左上
    Math.atan2(-iy, w - ix), // 右上
    Math.atan2(h - iy, w - ix), // 右下
    Math.atan2(h - iy, -ix), // 左下
  ].map((a) => (a + Math.PI * 2) % (Math.PI * 2))
  corners.sort((a, b) => a - b)

  // 角から角までの各セクター内に、等間隔のスポークを配置する。
  const per = Math.max(1, Math.round(spokes / 4))
  const angles: number[] = []
  for (let k = 0; k < 4; k++) {
    const a0 = corners[k]
    let a1 = corners[(k + 1) % 4]
    if (a1 <= a0) a1 += Math.PI * 2
    angles.push(a0) // 角のスポークそのもの
    for (let s = 1; s < per; s++) {
      const f = s / per
      const jit = (random() * 2 - 1) * jitter * ((a1 - a0) / per)
      angles.push(a0 + (a1 - a0) * f + jit)
    }
  }
  const A = angles.length

  // point[a][r]: スポーク a に沿ったリング r（r のインデックスは 0..rings-1）。
  // 衝撃点（0）から境界（1）までの距離の割合に揺らぎを加える (最も外側は境界そのもの)。
  const hit: Pt[] = angles.map((a) => rayToRect(ix, iy, a, w, h))
  const pt = (a: number, r: number): Pt => {
    const [hx, hy] = hit[a]
    let f = (r + 1) / rings
    if (r < rings - 1) f += (random() * 2 - 1) * jitter * (1 / rings)
    f = Math.max(0.04, Math.min(0.999, f))
    return [ix + (hx - ix) * f, iy + (hy - iy) * f]
  }

  // 隣り合う破片が同一の頂点を共有するよう、リングの点をキャッシュする。
  const grid: Pt[][] = angles.map((_, a) => Array.from({ length: rings }, (_, r) => pt(a, r)))

  const shards: Shard[] = []
  for (let a = 0; a < A; a++) {
    const a2 = (a + 1) % A
    // 最も内側: 衝撃点を中心とした三角形のファン。
    const tri: Pt[] = [[ix, iy], grid[a][0], grid[a2][0]]
    shards.push({ poly: tri, ...centroid(tri) })
    // 外側の帯: 連続するリングの間の四角形。
    for (let r = 0; r < rings - 1; r++) {
      const quad: Pt[] = [grid[a][r], grid[a2][r], grid[a2][r + 1], grid[a][r + 1]]
      shards.push({ poly: quad, ...centroid(quad) })
    }
  }
  return shards
}

export function polyToClip(poly: Pt[]): string {
  return `polygon(${poly.map(([x, y]) => `${x}px ${y}px`).join(", ")})`
}

// ---------------------------------------------------------------- 音

type AudioCtor = typeof AudioContext

/** ガラスの割れる音（音源ファイル不要の合成音）を ctx で鳴らす。 */
function playBreak(ctx: AudioContext) {
  if (ctx.state === "suspended") void ctx.resume()
  const now = ctx.currentTime

  // 衝撃: 短く明るいノイズバースト。
  const len = Math.ceil(ctx.sampleRate * 0.18)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 2000
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.22, now)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
  src.connect(hp).connect(g).connect(ctx.destination)
  src.start(now)
  src.stop(now + 0.2)

  // チリンチリン: 落ちる破片のような、高く小さな音の散らばり。
  for (let k = 0; k < 9; k++) {
    const t = now + 0.03 + Math.random() * 0.4
    const osc = ctx.createOscillator()
    const og = ctx.createGain()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(2200 + Math.random() * 3500, t)
    og.gain.setValueAtTime(0.0001, t)
    og.gain.exponentialRampToValueAtTime(0.06, t + 0.005)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
    osc.connect(og).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.14)
  }
}

// ---------------------------------------------------------------- コントローラ

const SVG_NS = "http://www.w3.org/2000/svg"
const ZERO: ShardTransform = { x: 0, y: 0, rot: 0 }

/** 衝撃のフラッシュ用の keyframes (overlay に 1 つだけ差し込む)。 */
const FLASH_CSS = `
@keyframes hc-glass-flash {
  from { width: 12px; height: 12px; opacity: 0.9; }
  to   { width: 160px; height: 160px; opacity: 0;
         margin-left: -74px; margin-top: -74px; }
}`

const INITIAL: ShatterGlassState = { shattered: false, impact: null, shardCount: 0, dragging: null }

/** 破片 1 枚ぶんの DOM。 */
interface ShardView {
  wrap: HTMLDivElement
  clip: HTMLDivElement
  svg: SVGSVGElement
}

export function createShatterGlass(
  { root, content, overlay }: ShatterGlassElements,
  options: ShatterGlassOptions = {},
): ShatterGlassController {
  const spokes = options.spokes ?? 16
  const rings = options.rings ?? 4
  const jitter = options.jitter ?? 0.5
  const draggable = options.draggable ?? true
  const sound = options.sound ?? true

  const store = createStore<ShatterGlassState>(INITIAL)

  // destroy() で戻すため、触る前のスタイルを覚えておく。
  const saved = {
    root: root.style.cssText,
    content: content.style.cssText,
    overlay: overlay.style.cssText,
  }
  Object.assign(root.style, {
    position: "relative",
    overflow: "visible",
    isolation: "isolate",
    cursor: "crosshair",
  })
  // overlay 自体は z-index を持たない (= 重なりの文脈を作らない) ので、
  // 破片の z-index は root の文脈で効き、ラッパーの操作バー (z-index 10001) の下に入る。
  Object.assign(overlay.style, { position: "absolute", inset: "0", pointerEvents: "none" })

  const styleEl = document.createElement("style")
  styleEl.textContent = FLASH_CSS
  overlay.appendChild(styleEl)

  let size = { w: 0, h: 0 }
  let shards: Shard[] = []
  let transforms: ShardTransform[] = []
  let z: number[] = []
  let zTop = 1
  let views: ShardView[] = []
  let flash: HTMLDivElement | null = null
  let drag: { i: number; px: number; py: number; ox: number; oy: number } | null = null
  let audio: AudioContext | null = null
  let destroyed = false

  const measure = () => {
    const r = root.getBoundingClientRect()
    return { w: r.width, h: r.height }
  }

  // ------------------------------------------------ 描画

  const applyTransform = (i: number) => {
    const v = views[i]
    if (!v) return
    const t = transforms[i] ?? ZERO
    const isDragging = drag?.i === i
    const s = v.wrap.style
    s.transform = `translate(${t.x}px, ${t.y}px) rotate(${t.rot}deg) scale(${isDragging ? 1.04 : 1})`
    s.transition = isDragging ? "none" : "transform 0.7s cubic-bezier(.2,.8,.2,1)"
    s.zIndex = String(100 + (z[i] ?? 0))
    s.filter = `drop-shadow(0 ${isDragging ? 8 : 3}px ${isDragging ? 14 : 6}px rgba(0,0,0,0.45))`
    v.clip.style.cursor = isDragging ? "grabbing" : "grab"
  }

  /** content の見た目の複製 (操作できない静的なコピー)。 */
  const cloneContent = () => {
    const copy = content.cloneNode(true) as HTMLElement
    copy.style.cssText = saved.content
    copy.style.pointerEvents = "none"
    copy.style.userSelect = "none"
    copy.removeAttribute("id")
    copy.setAttribute("aria-hidden", "true")
    for (const el of copy.querySelectorAll("[id]")) el.removeAttribute("id")
    return copy
  }

  const clearShards = () => {
    for (const v of views) v.wrap.remove()
    views = []
    flash?.remove()
    flash = null
  }

  const renderShards = () => {
    clearShards()
    const { w, h } = size
    views = shards.map((s, i) => {
      const wrap = document.createElement("div")
      Object.assign(wrap.style, {
        position: "absolute",
        inset: "0",
        width: `${w}px`,
        height: `${h}px`,
        pointerEvents: "none",
        transformOrigin: `${s.cx}px ${s.cy}px`,
      })

      // クリップされたページのコピー。clip-path はヒットテストもクリップするので、
      // 破片の形状だけがポインターを受け取る。
      const clip = document.createElement("div")
      const cp = polyToClip(s.poly)
      Object.assign(clip.style, {
        position: "absolute",
        inset: "0",
        clipPath: cp,
        pointerEvents: draggable ? "auto" : "none",
      })
      clip.style.setProperty("-webkit-clip-path", cp)
      clip.dataset.shard = String(i)
      clip.appendChild(cloneContent())
      wrap.appendChild(clip)

      // ひびの縁: 破片に沿った明るいガラス質のハイライト。
      const svg = document.createElementNS(SVG_NS, "svg")
      svg.setAttribute("width", String(w))
      svg.setAttribute("height", String(h))
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`)
      svg.setAttribute("aria-hidden", "true")
      svg.style.cssText = "position:absolute;inset:0;pointer-events:none"
      const polygon = document.createElementNS(SVG_NS, "polygon")
      polygon.setAttribute("points", s.poly.map(([x, y]) => `${x},${y}`).join(" "))
      polygon.setAttribute("fill", "none")
      polygon.setAttribute("stroke", "rgba(255,255,255,0.85)")
      polygon.setAttribute("stroke-width", "1.2")
      polygon.setAttribute("stroke-linejoin", "round")
      svg.appendChild(polygon)
      wrap.appendChild(svg)

      overlay.appendChild(wrap)
      return { wrap, clip, svg }
    })
    views.forEach((_, i) => applyTransform(i))
  }

  const renderFlash = (ix: number, iy: number) => {
    flash?.remove()
    const f = document.createElement("div")
    f.setAttribute("aria-hidden", "true")
    Object.assign(f.style, {
      position: "absolute",
      left: `${ix}px`,
      top: `${iy}px`,
      width: "0",
      height: "0",
      zIndex: "9000",
      pointerEvents: "none",
    })
    const dot = document.createElement("div")
    Object.assign(dot.style, {
      position: "absolute",
      transform: "translate(-50%, -50%)",
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      background: "radial-gradient(circle, #fff, rgba(255,255,255,0))",
      animation: "hc-glass-flash 0.5s ease-out forwards",
    })
    f.appendChild(dot)
    overlay.appendChild(f)
    flash = f
  }

  /** 砕けた / 戻ったに合わせて content と root の見た目を切り替える。 */
  const setShatteredView = (shattered: boolean) => {
    // 砕けたあとの本物は非表示にするが、レイアウトのサイズ計算のために残す。
    content.style.visibility = shattered ? "hidden" : ""
    content.style.pointerEvents = shattered ? "none" : ""
    root.style.cursor = shattered ? "default" : "crosshair"
  }

  // ------------------------------------------------ 破砕 / 修復

  /** 現在の衝撃点とサイズで破片を作りなおす。keepTransforms なら枚数が同じ限り移動量を引き継ぐ。 */
  const rebuild = (keepTransforms: boolean) => {
    const impact = store.get().impact
    if (!impact || size.w === 0 || size.h === 0) return
    shards = buildShards(
      size.w,
      size.h,
      impact.fx * size.w,
      impact.fy * size.h,
      spokes,
      rings,
      jitter,
    )
    const n = shards.length
    if (!keepTransforms || transforms.length !== n) {
      // 破片の集合が変わったら（新しい衝撃 / 枚数の変化）移動量と重なり順をリセットする。
      transforms = Array.from({ length: n }, () => ZERO)
      z = Array.from({ length: n }, () => 0)
      zTop = 1
    }
    renderShards()
    store.patch({ shardCount: n })
  }

  const shatterAt = (clientX: number, clientY: number) => {
    if (destroyed || store.get().shattered) return
    size = measure()
    if (size.w === 0 || size.h === 0) return
    const r = root.getBoundingClientRect()
    const impact = { fx: (clientX - r.left) / r.width, fy: (clientY - r.top) / r.height }
    store.patch({ impact, shattered: true, dragging: null })
    rebuild(false)
    setShatteredView(true)
    renderFlash(impact.fx * size.w, impact.fy * size.h)
    if (sound) {
      try {
        if (!audio) {
          const AC =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
          if (AC) audio = new AC()
        }
        if (audio) playBreak(audio)
      } catch {
        // 音が鳴らせない環境 (自動再生の制限など) では黙って諦める。
      }
    }
    options.onShatter?.()
  }

  const repair = () => {
    if (destroyed) return
    drag = null
    clearShards()
    shards = []
    transforms = []
    z = []
    zTop = 1
    setShatteredView(false)
    store.set(INITIAL)
  }

  const drop = () => {
    const impact = store.get().impact
    if (destroyed || !impact || size.w === 0) return
    const ix = impact.fx * size.w
    const iy = impact.fy * size.h
    transforms = shards.map((s) => {
      const ang = Math.atan2(s.cy - iy, s.cx - ix)
      const push = 60 + Math.random() * 140
      return {
        x: Math.cos(ang) * push,
        y: Math.sin(ang) * push + 220 + Math.random() * 260, // 重力による下向きバイアス
        rot: (Math.random() * 2 - 1) * 90,
      }
    })
    views.forEach((_, i) => applyTransform(i))
  }

  // ------------------------------------------------ イベント

  const onContentClick = (e: MouseEvent) => {
    if (!store.get().shattered) shatterAt(e.clientX, e.clientY)
  }

  const onOverlayPointerDown = (e: PointerEvent) => {
    if (!draggable) return
    const target = (e.target as Element | null)?.closest?.("[data-shard]") as HTMLElement | null
    if (!target || !overlay.contains(target)) return
    const i = Number(target.dataset.shard)
    e.preventDefault()
    const t = transforms[i] ?? ZERO
    drag = { i, px: e.clientX, py: e.clientY, ox: t.x, oy: t.y }
    z[i] = zTop++
    applyTransform(i)
    store.patch({ dragging: i })
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!drag) return
    const d = drag
    transforms[d.i] = {
      x: d.ox + (e.clientX - d.px),
      y: d.oy + (e.clientY - d.py),
      rot: transforms[d.i]?.rot ?? 0,
    }
    applyTransform(d.i)
  }

  const onPointerUp = () => {
    if (!drag) return
    const i = drag.i
    drag = null
    applyTransform(i)
    store.patch({ dragging: null })
  }

  content.addEventListener("click", onContentClick)
  overlay.addEventListener("pointerdown", onOverlayPointerDown)
  if (draggable) {
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  // リサイズしたら、割合で持っている衝撃点から破片を作りなおす。
  let ro: ResizeObserver | null = null
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => {
      const next = measure()
      if (next.w === size.w && next.h === size.h) return
      size = next
      if (store.get().shattered) rebuild(true)
    })
    ro.observe(root)
  }

  return {
    get: store.get,
    subscribe: store.subscribe,
    shatterAt,
    drop,
    repair,
    getShards: () => shards,
    getTransforms: () => transforms,
    destroy() {
      if (destroyed) return
      destroyed = true
      drag = null
      ro?.disconnect()
      content.removeEventListener("click", onContentClick)
      overlay.removeEventListener("pointerdown", onOverlayPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      clearShards()
      styleEl.remove()
      root.style.cssText = saved.root
      content.style.cssText = saved.content
      overlay.style.cssText = saved.overlay
      if (audio) void audio.close().catch(() => {})
      audio = null
    },
  }
}
