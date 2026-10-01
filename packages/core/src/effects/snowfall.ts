// Snowfall — 包んだページに雪を降らせ、ダイアログやカードの上の縁と地面に積もらせる演出のヘッドレスなコントローラ。
//
// - 積もる先は root の中の `[data-snow-target]` の要素 (上の縁) と、root の底 (地面)。要素が動いても雪は一緒に動く
// - 積もった雪は 2px 幅の柱の高さ (pile) で持ち、崩れる角度より急な段差は隣へ流す。端に近いほど薄くする
// - shake(要素) で積もった雪を払い落とす (粒に戻して降らせる)。melt() で全部溶かす
// - 描くのは root を覆う canvas 1 枚 (pointer-events: none なので下のページはそのまま操作できる)
// - prefers-reduced-motion のときは降らせない (積もった絵だけ出す)
//
// UI 側 (React / Vue) は root と canvas を渡すだけ。destroy() で rAF・ResizeObserver・書き換えたスタイルを戻す。
import { createStore, type ReadableStore } from "../store"

export interface SnowfallElements {
  /** 雪を降らせる範囲 (position: relative にする)。 */
  root: HTMLElement
  /** root を覆って雪を描く canvas。 */
  canvas: HTMLCanvasElement
}

export interface SnowfallOptions {
  /** 降る量 (1 秒あたり、幅 1000px あたりの粒の数)。@default 70 */
  intensity?: number
  /** 風 (px/秒。正で右へ)。@default 15 */
  wind?: number
  /** 積もらせる。@default true */
  accumulate?: boolean
  /** 積もる深さの上限 (px)。@default 24 */
  maxDepth?: number
  /** 積もる先の要素。@default "[data-snow-target]" */
  targetSelector?: string
  /** root の底 (地面) にも積もらせる。@default true */
  ground?: boolean
}

export interface SnowfallState {
  intensity: number
  wind: number
  /** いま舞っている粒の数。 */
  flakes: number
  /** 積もった粒の数 (累計)。 */
  landed: number
  paused: boolean
}

export interface SnowfallController extends ReadableStore<SnowfallState> {
  setIntensity(intensity: number): void
  setWind(wind: number): void
  /** 積もった雪を払い落とす (要素を渡せばその要素だけ、省略すると全部)。 */
  shake(target?: Element): void
  /** 積もった雪を消す。 */
  melt(): void
  setPaused(paused: boolean): void
  destroy(): void
}

/** 1 本の柱の幅 (px)。 */
export const SNOW_COLUMN_PX = 2
/** 崩れ始める段差 (柱 1 本あたり px)。これより急なら隣へ流れる。 */
const REPOSE = 1.6

/**
 * 柱 col を中心に半径 radius 本へ山なりに雪を足す。端 (edgeTaper 本以内) ほど薄く、max を超えない。
 * 足せた量を返す (0 なら積もれなかった = もう満杯)。
 */
export function depositSnow(
  pile: Float32Array,
  col: number,
  amount: number,
  radius: number,
  max: number,
  edgeTaper = 6,
): number {
  let added = 0
  for (let c = col - radius; c <= col + radius; c++) {
    if (c < 0 || c >= pile.length) continue
    const w = 1 - Math.abs(c - col) / (radius + 1)
    // 縁に近いほど上限を下げる (角で雪がこんもり宙に浮かないように)
    const edge = Math.min(c, pile.length - 1 - c)
    const cap = max * Math.min(1, (edge + 1) / edgeTaper)
    const next = Math.min(cap, pile[c] + amount * w)
    if (next > pile[c]) {
      added += next - pile[c]
      pile[c] = next
    }
  }
  return added
}

/** 急な段差を隣へ流して、なだらかにする (崩れる角度より急なら半分ずつ)。何回か回すと落ち着く。 */
export function relaxPile(pile: Float32Array, passes = 2): void {
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < pile.length - 1; i++) {
      const d = pile[i] - pile[i + 1]
      if (Math.abs(d) > REPOSE) {
        const move = (Math.abs(d) - REPOSE) / 2
        if (d > 0) {
          pile[i] -= move
          pile[i + 1] += move
        } else {
          pile[i] += move
          pile[i + 1] -= move
        }
      }
    }
  }
}

interface Flake {
  x: number
  y: number
  vy: number
  r: number
  phase: number
  sway: number
  /** 払い落とした粒 (重力で落ち、しばらくは元の要素に積もらない)。 */
  vx: number
  loose: number
  from: Element | null
}

interface Pile {
  heights: Float32Array
  /** 前回の幅 (変わったら柱を作り直す)。 */
  width: number
}

const TAU = Math.PI * 2

export function createSnowfall(
  { root, canvas }: SnowfallElements,
  options: SnowfallOptions = {},
): SnowfallController {
  const accumulate = options.accumulate ?? true
  const maxDepth = options.maxDepth ?? 24
  const selector = options.targetSelector ?? "[data-snow-target]"
  const useGround = options.ground ?? true
  const reduced =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches

  const store = createStore<SnowfallState>({
    intensity: options.intensity ?? 70,
    wind: options.wind ?? 15,
    flakes: 0,
    landed: 0,
    paused: false,
  })

  const saved = [root, canvas].map((el) => [el, el.style.cssText] as const)
  root.style.position = "relative"
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "5",
  })
  const ctx = canvas.getContext?.("2d") ?? null

  let width = root.clientWidth
  let height = root.clientHeight
  const dpr = () => Math.min(2, globalThis.devicePixelRatio || 1)
  const resize = () => {
    width = root.clientWidth
    height = root.clientHeight
    canvas.width = Math.max(1, Math.round(width * dpr()))
    canvas.height = Math.max(1, Math.round(height * dpr()))
  }
  resize()
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null
  ro?.observe(root)

  const flakes: Flake[] = []
  const piles = new Map<Element | "ground", Pile>()
  let targets: Element[] = []
  let lastScan = -Infinity
  let spawnDebt = 0
  let landed = 0
  let raf = 0
  let last = 0
  let destroyed = false

  const pileFor = (key: Element | "ground", w: number): Pile => {
    const cols = Math.max(1, Math.ceil(w / SNOW_COLUMN_PX))
    let p = piles.get(key)
    if (!p || p.heights.length !== cols) {
      // 幅が変わったら柱を作り直す (前の雪は比率で写す)
      const heights = new Float32Array(cols)
      if (p)
        for (let i = 0; i < cols; i++)
          heights[i] = p.heights[Math.floor((i / cols) * p.heights.length)]
      p = { heights, width: w }
      piles.set(key, p)
    }
    return p
  }

  /** root から見た要素の上の縁 (x0, x1, top)。 */
  const rectOf = (el: Element) => {
    const r = el.getBoundingClientRect()
    const o = root.getBoundingClientRect()
    return {
      x0: r.left - o.left,
      x1: r.right - o.left,
      top: r.top - o.top,
      bottom: r.bottom - o.top,
    }
  }

  const spawn = (x: number, y: number, extra?: Partial<Flake>) => {
    const r = 1 + Math.random() * 2.2
    flakes.push({
      x,
      y,
      vy: 25 + r * 18 + Math.random() * 15,
      r,
      phase: Math.random() * TAU,
      sway: 6 + Math.random() * 14,
      vx: 0,
      loose: 0,
      from: null,
      ...extra,
    })
  }

  const land = (pile: Pile, localX: number, f: Flake) => {
    const col = Math.floor(localX / SNOW_COLUMN_PX)
    const amt = f.r * 0.9
    if (depositSnow(pile.heights, col, amt, Math.ceil(f.r * 1.5), maxDepth) > 0) landed++
  }

  const step = (dt: number, now: number) => {
    const { intensity, wind } = store.get()
    // 積もる先は 1 秒ごとに探し直す (後から出てきたダイアログも拾う)
    if (now - lastScan > 1000) {
      targets = [...root.querySelectorAll(selector)]
      lastScan = now
      for (const k of piles.keys()) if (k !== "ground" && !targets.includes(k)) piles.delete(k)
    }
    const rects = targets.map((el) => ({ el, ...rectOf(el) }))

    // 新しい粒 (画面の上の少し外から。風上側にも余分に出す)
    spawnDebt += intensity * (width / 1000) * dt
    while (spawnDebt >= 1) {
      spawnDebt--
      spawn(-wind * 0.5 + Math.random() * (width + Math.abs(wind)), -10)
    }

    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i]
      const prevY = f.y
      if (f.loose > 0) {
        // 払い落とした粒: 重力つきで飛ぶ
        f.loose -= dt
        f.vy += 420 * dt
        f.x += f.vx * dt
        f.vx *= 0.98
      } else {
        f.phase += dt * (1 + f.r * 0.3)
        f.x += (wind + Math.sin(f.phase) * f.sway) * dt
      }
      f.y += f.vy * dt

      let gone = f.y > height + 10 || f.x < -60 || f.x > width + 60
      if (!gone && accumulate) {
        for (const t of rects) {
          if (f.from === t.el && f.loose > 0) continue
          if (f.x < t.x0 || f.x > t.x1 || t.top > height) continue
          const pile = pileFor(t.el, t.x1 - t.x0)
          const col = Math.min(pile.heights.length - 1, Math.floor((f.x - t.x0) / SNOW_COLUMN_PX))
          const surface = t.top - pile.heights[col]
          if (prevY <= surface && f.y >= surface && f.vy > 0) {
            land(pile, f.x - t.x0, f)
            gone = true
            break
          }
        }
        if (!gone && useGround) {
          const pile = pileFor("ground", width)
          const col = Math.min(
            pile.heights.length - 1,
            Math.max(0, Math.floor(f.x / SNOW_COLUMN_PX)),
          )
          if (f.y >= height - pile.heights[col]) {
            land(pile, f.x, f)
            gone = true
          }
        }
      }
      if (gone) flakes.splice(i, 1)
    }
    for (const p of piles.values()) relaxPile(p.heights, 1)
    store.patch({ flakes: flakes.length, landed })
    return rects
  }

  const draw = (rects: { el: Element; x0: number; x1: number; top: number }[]) => {
    if (!ctx) return
    const s = dpr()
    ctx.setTransform(s, 0, 0, s, 0, 0)
    ctx.clearRect(0, 0, width, height)

    // 積もった雪: 上の輪郭を折れ線にして塗る。影でふんわり盛り上がって見せる
    const drawPile = (heights: Float32Array, x0: number, base: number) => {
      if (!heights.some((h) => h > 0.3)) return
      ctx.beginPath()
      ctx.moveTo(x0, base)
      for (let i = 0; i < heights.length; i++)
        ctx.lineTo(x0 + i * SNOW_COLUMN_PX, base - heights[i])
      ctx.lineTo(x0 + heights.length * SNOW_COLUMN_PX, base)
      ctx.closePath()
      const g = ctx.createLinearGradient(0, base - maxDepth, 0, base)
      g.addColorStop(0, "#ffffff")
      g.addColorStop(1, "#dce9f7")
      ctx.fillStyle = g
      ctx.shadowColor = "rgba(40,70,110,0.35)"
      ctx.shadowBlur = 6
      ctx.shadowOffsetY = 2
      ctx.fill()
      ctx.shadowColor = "transparent"
    }
    for (const t of rects) {
      const p = piles.get(t.el)
      if (p) drawPile(p.heights, t.x0, t.top)
    }
    const ground = piles.get("ground")
    if (ground) drawPile(ground.heights, 0, height)

    // 舞っている粒
    ctx.fillStyle = "rgba(255,255,255,0.92)"
    ctx.shadowColor = "rgba(150,180,220,0.6)"
    ctx.shadowBlur = 3
    ctx.beginPath()
    for (const f of flakes) {
      ctx.moveTo(f.x + f.r, f.y)
      ctx.arc(f.x, f.y, f.r, 0, TAU)
    }
    ctx.fill()
    ctx.shadowColor = "transparent"
  }

  const frame = (now: number) => {
    if (destroyed) return
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0)
    last = now
    if (!store.get().paused && !reduced) draw(step(dt, now))
    raf = requestAnimationFrame(frame)
  }
  if (typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame)

  const shake = (target?: Element) => {
    for (const [key, p] of piles) {
      if (key === "ground" || (target && key !== target)) continue
      const r = rectOf(key)
      // 積もった量に応じて粒に戻し、上と横へはじき飛ばす
      for (let i = 0; i < p.heights.length; i += 2) {
        const h = p.heights[i]
        for (let k = 0; k < h / 3; k++) {
          spawn(r.x0 + i * SNOW_COLUMN_PX, r.top - Math.random() * h, {
            vy: -60 - Math.random() * 140,
            vx: (Math.random() - 0.5) * 160,
            loose: 0.6,
            from: key,
          })
        }
      }
      p.heights.fill(0)
    }
  }

  return {
    get: store.get,
    subscribe: store.subscribe,
    setIntensity: (intensity) => store.patch({ intensity: Math.max(0, intensity) }),
    setWind: (wind) => store.patch({ wind }),
    shake,
    melt() {
      for (const p of piles.values()) p.heights.fill(0)
    },
    setPaused: (paused) => store.patch({ paused }),
    destroy() {
      if (destroyed) return
      destroyed = true
      cancelAnimationFrame(raf)
      ro?.disconnect()
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      for (const [el, css] of saved) el.style.cssText = css
    },
  }
}
