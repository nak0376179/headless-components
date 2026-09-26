// ジグソーパズル演出: 包んだ内容をかみ合うピースに切り分け、ドラッグで元の位置に戻して遊ぶ。
// ジオメトリ・ドラッグ・スナップ・効果音 (Web Audio)・DOM の複製とクリップはすべてここに集め、
// React / Vue 側は host 構造 (root / content / overlay) と操作 UI を描くだけにする。
import { createStore, type ReadableStore } from "../store"

/* ------------------------------------------------------------------ *
 * ジオメトリ: かみ合うジグソーピースのパスを生成する。
 *
 * すべてが隙間なくぴったり並ぶ仕掛け: 隣り合うピースは *まったく同じ*
 * 境界曲線を共有する。各グリッドの辺を一度だけ生成し、各ピースはその
 * 4 辺（うち 2 辺は逆向きにたどる）から組み立てる。曲線が同一なので、
 * あるピースの凸（タブ）はそのまま隣のピースの凹（ブランク）になる。
 * ------------------------------------------------------------------ */

type Pt = [number, number]
/** `p` で終わる 3 次セグメント。制御点は `c1`,`c2`。 */
type Seg = { c1: Pt; c2: Pt; p: Pt }
type Edge = { start: Pt; segs: Seg[] }

/** `p` まで引く直線（退化した 3 次曲線）セグメント。 */
function line(from: Pt, p: Pt): Seg {
  return { c1: from, c2: p, p }
}

/**
 * 古典的なジグソーの辺 1 本（3 本の 3 次ベジェ曲線）。市販の箱入り
 * パズルで見る形状: ほぼ直線の肩、本体側へのわずかな *えぐり*、くびれた
 * 首、そして大きな丸い玉、を反対側へ鏡映する。このえぐりがあるおかげで
 * 突起が単なるドームではなく「軸の上の玉」に見える。揺らぎを加えるのは
 * 深さと中心だけなので、ピースは整って規則的なまま。
 *
 * 座標はパラメトリック: `v` は辺に沿って 0→1、`w` は垂直方向の変位
 * （突起の向きは `sign` を掛けて決める）。`sign === 0` なら直線の縁の辺。
 *
 * `ax,ay` = 辺に沿う単位ベクトル、`px,py` = 垂直方向の単位ベクトル。
 */
function makeEdge(
  x0: number,
  y0: number,
  ax: number,
  ay: number,
  px: number,
  py: number,
  L: number,
  sign: number,
  rnd: () => number,
): Edge {
  const start: Pt = [x0, y0]
  if (sign === 0) return { start, segs: [line(start, [x0 + ax * L, y0 + ay * L])] }

  const u = (k: number) => (rnd() * 2 - 1) * k // ±k の小さな揺らぎ
  const t = 0.15 // 辺に沿った突起の半幅（くびれた首）
  const hc = 1.8 // 頭部の制御点の広がり（× t）→ 玉が首より張り出す
  const uc = 0.7 // えぐりの深さ（× e）→ 楕円のふくらみではなく鋭いくびれ
  const D = 0.26 + u(0.02) // 突起の深さ（垂直方向のピーク）
  const e = D / 2.5 // 垂直方向の単位（ピーク ≈ 2.5·e = D）
  const m = 0.5 + u(0.02) // 辺に沿った突起の中心

  // (v,w) を絶対座標の点へ変換する。
  const P = (v: number, w: number): Pt => [
    x0 + ax * L * v + px * L * w * sign,
    y0 + ay * L * v + py * L * w * sign,
  ]

  return {
    start: P(0, 0),
    segs: [
      // 肩、わずかなえぐり、くびれた首まで
      { c1: P(0.2, 0), c2: P(m, -e * uc), p: P(m - t, e) },
      // 丸い玉。首の両側へ張り出す
      { c1: P(m - hc * t, 3 * e), c2: P(m + hc * t, 3 * e), p: P(m + t, e) },
      // 鏡映: もう一度えぐり、反対側の角へ戻る
      { c1: P(m, -e * uc), c2: P(0.8, 0), p: P(1, 0) },
    ],
  }
}

/** (x,y) から +x 方向へ伸びる長さ L の水平な辺。 */
function hEdge(x: number, y: number, L: number, sign: number, rnd: () => number): Edge {
  return makeEdge(x, y, 1, 0, 0, 1, L, sign, rnd)
}

/** (x,y) から +y 方向へ伸びる長さ L の垂直な辺。 */
function vEdge(x: number, y: number, L: number, sign: number, rnd: () => number): Edge {
  return makeEdge(x, y, 0, 1, 1, 0, L, sign, rnd)
}

/** 辺を逆向きにたどる（同じ曲線で方向だけ反転）。 */
function reverse(e: Edge): Edge {
  const pts: Pt[] = [e.start, ...e.segs.map((s) => s.p)]
  const segs: Seg[] = []
  for (let k = e.segs.length - 1; k >= 0; k--) {
    segs.push({ c1: e.segs[k].c2, c2: e.segs[k].c1, p: pts[k] })
  }
  return { start: pts[pts.length - 1], segs }
}

function edgesToPath(edges: Edge[]): string {
  let d = `M ${edges[0].start[0]} ${edges[0].start[1]}`
  for (const e of edges) {
    for (const s of e.segs) {
      d += ` C ${s.c1[0]} ${s.c1[1]} ${s.c2[0]} ${s.c2[1]} ${s.p[0]} ${s.p[1]}`
    }
  }
  return d + " Z"
}

// 同じ `seed` なら必ず同じ切り方になる、小さな決定論的乱数生成器。
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** ピース 1 枚のジオメトリ。`cx,cy` は完成位置でのセル中心、`d` は SVG のパス。 */
export type JigsawPieceGeom = { r: number; c: number; cx: number; cy: number; d: string }

/** w×h の領域を rows×cols のかみ合うピースに切り分ける (seed が同じなら同じ切り方)。 */
export function buildJigsawPieces(
  w: number,
  h: number,
  rows: number,
  cols: number,
  seed: number,
): JigsawPieceGeom[] {
  if (!(w > 0 && h > 0 && rows > 0 && cols > 0)) return []
  const rnd = mulberry32(seed)
  const cw = w / cols
  const ch = h / rows
  const sign = () => (rnd() < 0.5 ? -1 : 1)

  // 水平方向のグリッド辺 H[i][j]: 行ライン i（0..rows）、セル列 j。
  const H: Edge[][] = []
  for (let i = 0; i <= rows; i++) {
    H[i] = []
    for (let j = 0; j < cols; j++) {
      const border = i === 0 || i === rows
      H[i][j] = hEdge(j * cw, i * ch, cw, border ? 0 : sign(), rnd)
    }
  }
  // 垂直方向のグリッド辺 V[r][j]: 列ライン j（0..cols）、セル行 r。
  const V: Edge[][] = []
  for (let r = 0; r < rows; r++) {
    V[r] = []
    for (let j = 0; j <= cols; j++) {
      const border = j === 0 || j === cols
      V[r][j] = vEdge(j * cw, r * ch, ch, border ? 0 : sign(), rnd)
    }
  }

  const pieces: JigsawPieceGeom[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = edgesToPath([
        H[r][c], // 上    : 左 -> 右
        V[r][c + 1], // 右    : 上 -> 下
        reverse(H[r + 1][c]), // 下    : 右 -> 左
        reverse(V[r][c]), // 左    : 下 -> 上
      ])
      pieces.push({ r, c, cx: (c + 0.5) * cw, cy: (r + 0.5) * ch, d })
    }
  }
  return pieces
}

/** ピースが定位置にスナップして固定されるまでに、どれだけ近づく必要があるか（px）。 */
export function jigsawSnapDistance(cellW: number, cellH: number): number {
  return Math.max(30, Math.min(cellW, cellH) * 0.5)
}

/* ------------------------------------------------------------------ *
 * コントローラ
 * ------------------------------------------------------------------ */

/** 完成位置からのずれ。 */
export type JigsawTransform = { x: number; y: number; rot: number }
const ZERO: JigsawTransform = { x: 0, y: 0, rot: 0 }

/** ラッパーが描く host 構造。`<div root><div content>…</div><div overlay/></div>` を想定。 */
export interface JigsawElements {
  /** 全体を包む要素。サイズの計測とピースの配置の基準になる。 */
  root: HTMLElement
  /** 包んだ内容。レイアウト用に非表示で残し、ピースはこれを複製して作る。 */
  content: HTMLElement
  /** ピース・ガイドなどをコアが差し込む空の要素。 */
  overlay: HTMLElement
}

export interface JigsawOptions {
  /** パズルの行数。@default 4 */
  rows?: number
  /** パズルの列数。@default 6 */
  cols?: number
  /** ピースをシャッフルした状態でゲームを開始する。@default true */
  scattered?: boolean
  /** ユーザーがピースをドラッグできるようにする。@default true */
  draggable?: boolean
  /** パズルの切り方を変える。@default 1 */
  seed?: number
  /** ピースが定位置にはまったときに合成したクリック音を鳴らす。@default true */
  sound?: boolean
  /** すべてのピースが定位置に固定されたときに一度だけ発火する。 */
  onSolved?: () => void
}

export interface JigsawState {
  /** 計測した描画領域の幅・高さ (px)。まだ計測できていなければ 0。 */
  width: number
  height: number
  /** ピースの総数 (描画領域が 0 の間は 0)。 */
  total: number
  /** 定位置に固定されたピースの数。 */
  placed: number
  /** 全ピースが固定されたら true。 */
  solved: boolean
  /** ピースごとの固定状態。 */
  locked: readonly boolean[]
  /** ドラッグ中のピースの番号。ドラッグしていなければ null。 */
  dragging: number | null
  /** ドラッグ中のピースが定位置のスナップ範囲内にあるとき true。 */
  snapReady: boolean
}

export interface JigsawController extends ReadableStore<JigsawState> {
  /** 全ピースを外してばらまく。 */
  shuffle(): void
  /** 全ピースを定位置に戻して固定する。 */
  solve(): void
  /** 効果音のオン/オフを作りなおさずに切り替える。 */
  setSound(on: boolean): void
  /** ピース i の現在のずれ (テスト・デバッグ用)。 */
  transformOf(i: number): JigsawTransform
  /** 作った DOM・リスナー・タイマーをすべて外し、書き換えたスタイルを元に戻す。 */
  destroy(): void
}

const SVG_NS = "http://www.w3.org/2000/svg"
let seq = 0

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  return el
}

/** 書き換える前のインラインスタイルを覚えておき、destroy で戻す。 */
function saveStyles(el: HTMLElement, props: string[]) {
  const hadStyle = el.hasAttribute("style")
  const saved = props.map((p) => [p, el.style.getPropertyValue(p), el.style.getPropertyPriority(p)])
  return () => {
    for (const [p, v, prio] of saved) {
      if (v) el.style.setProperty(p, v, prio)
      else el.style.removeProperty(p)
    }
    // もともと style 属性が無ければ、空の属性も残さない。
    if (!hadStyle && !el.getAttribute("style")) el.removeAttribute("style")
  }
}

type PieceEls = {
  wrap: HTMLDivElement
  clip: HTMLDivElement
  inner: HTMLDivElement
  outlineSvg: SVGSVGElement
  halo: SVGPathElement
  stroke: SVGPathElement
}

/**
 * ジグソーパズルを host 構造に取り付ける。
 * root の大きさを ResizeObserver で測り、content の複製をピースの形にクリップして overlay に並べる。
 */
export function createJigsaw(els: JigsawElements, options: JigsawOptions = {}): JigsawController {
  const { root, content, overlay } = els
  const rows = options.rows ?? 4
  const cols = options.cols ?? 6
  const seed = options.seed ?? 1
  const scattered = options.scattered ?? true
  const draggable = options.draggable ?? true
  let sound = options.sound ?? true
  const uid = `hc-jigsaw-${++seq}`

  const store = createStore<JigsawState>({
    width: 0,
    height: 0,
    total: 0,
    placed: 0,
    solved: false,
    locked: [],
    dragging: null,
    snapReady: false,
  })

  // ---- host のスタイル (destroy で戻す)
  const restoreRoot = saveStyles(root, ["position", "overflow", "isolation"])
  const restoreContent = saveStyles(content, ["visibility", "pointer-events"])
  // 複製には元のインラインスタイルを引き継がせるため、書き換える前の値を控える。
  const contentVisibility = content.style.visibility
  const contentPointerEvents = content.style.pointerEvents
  root.style.position = "relative"
  root.style.overflow = "visible"
  root.style.isolation = "isolate"
  // 非表示のまま残して自然なレイアウトサイズを確保する。
  content.style.visibility = "hidden"
  content.style.pointerEvents = "none"

  // ---- ゲームの状態 (ドラッグ中に毎フレーム変わる transform はストアに載せず DOM に直接書く)
  let w = 0
  let h = 0
  let pieces: JigsawPieceGeom[] = []
  let transforms: JigsawTransform[] = []
  let locked: boolean[] = []
  let z: number[] = []
  let zTop = 1 // アクティブなピースを前面に出すための連番カウンター
  let wasSolved = false
  let destroyed = false
  let dragging: {
    i: number
    px: number // つかんだ時点のポインター x
    py: number // つかんだ時点のポインター y
    ox: number // つかんだ時点のピースのオフセット x
    oy: number // つかんだ時点のピースのオフセット y
    x: number // 現在のオフセット x
    y: number // 現在のオフセット y
  } | null = null
  let snapReady = false

  // ---- overlay に差し込む DOM
  let defsSvg: SVGSVGElement | null = null
  let guideSvg: SVGSVGElement | null = null
  let pieceEls: PieceEls[] = []

  const snapDist = () => jigsawSnapDistance(cols > 0 ? w / cols : 0, rows > 0 ? h / rows : 0)

  // ---------------------------------------------------------------- 効果音

  // スナップ時の「カチッ」音用に遅延生成する AudioContext（音源ファイル不要の合成音）。
  let audio: AudioContext | null = null
  const getAudio = () => {
    if (!sound || destroyed) return null
    if (!audio) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      audio = new AC()
    }
    if (audio.state === "suspended") void audio.resume()
    return audio
  }

  // 乾いた機械的な「カチッ」: 非常に短く鋭いノイズの過渡音を 2 つ（「カ」
  // その後「チ」）、素早く減衰させる。音程のあるトーンを使わないので、
  // 「ピュッ」というスイープではなく硬いクリック/カチャという音に聞こえる。
  const playClick = () => {
    const ctx = getAudio()
    if (!ctx) return
    const now = ctx.currentTime

    // フィルタを通した短いノイズバースト 1 回（衝撃的な「チッ」音）。
    const tick = (at: number, dur: number, freq: number, q: number, peak: number) => {
      const len = Math.max(1, Math.ceil(ctx.sampleRate * dur))
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len) // ホワイトノイズ、線形フェード
      }
      const src = ctx.createBufferSource()
      src.buffer = buf
      const bp = ctx.createBiquadFilter()
      bp.type = "bandpass"
      bp.frequency.value = freq
      bp.Q.value = q
      const hp = ctx.createBiquadFilter()
      hp.type = "highpass"
      hp.frequency.value = 1400 // 低い唸りを除去 -> くっきりしたクリック音
      const g = ctx.createGain()
      g.gain.setValueAtTime(peak, at) // 瞬時のアタック
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      src.connect(bp).connect(hp).connect(g).connect(ctx.destination)
      src.start(at)
      src.stop(at + dur + 0.005)
    }

    tick(now, 0.012, 2700, 1.1, 0.5) // 「カ」— 明るめで少し長い
    tick(now + 0.022, 0.008, 3500, 1.4, 0.38) // 「チ」— 鋭く小さめ
  }

  // パズル全体が完成したときの 3 音の小さなファンファーレ。
  const playWin = () => {
    const ctx = getAudio()
    if (!ctx) return
    ;[0, 0.12, 0.24].forEach((dt, k) => {
      const t = ctx.currentTime + dt
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = "triangle"
      osc.frequency.setValueAtTime([523, 659, 784][k], t)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
      osc.connect(g).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.24)
    })
  }

  // ---------------------------------------------------------------- 状態の公開

  /** 固定状態・ドラッグ状態をストアへ反映し、完成したら onSolved を一度だけ発火する。 */
  const publish = () => {
    const placed = locked.filter(Boolean).length
    const total = pieces.length
    const solved = total > 0 && placed === total
    store.set({
      width: w,
      height: h,
      total,
      placed,
      solved,
      locked: locked.slice(),
      dragging: dragging?.i ?? null,
      snapReady,
    })
    // 完成ガイドは完成すると非表示になる。
    if (guideSvg) guideSvg.style.display = solved ? "none" : ""
    if (solved && !wasSolved) {
      wasSolved = true
      playWin()
      options.onSolved?.()
    } else if (!solved) {
      wasSolved = false
    }
  }

  /** ドラッグ中のスナップ可否だけが変わったときの軽い通知。 */
  const setSnapReady = (v: boolean) => {
    if (v === snapReady) return
    snapReady = v
    store.patch({ snapReady: v })
  }

  // ---------------------------------------------------------------- 描画

  /** content の複製を 1 つ作る (レイアウト用に書き換えたスタイルは元に戻す)。 */
  const cloneContent = () => {
    const clone = content.cloneNode(true) as HTMLElement
    clone.style.visibility = contentVisibility
    clone.style.pointerEvents = contentPointerEvents
    if (!clone.getAttribute("style")) clone.removeAttribute("style")
    return clone
  }

  /** ピース i の見た目 (transform・重なり順・影・輪郭線) を現在の状態に合わせる。 */
  const paint = (i: number) => {
    const el = pieceEls[i]
    const p = pieces[i]
    if (!el || !p) return
    const t = transforms[i] ?? ZERO
    const isDragging = dragging?.i === i
    const isLocked = !!locked[i]
    const isSnapping = isDragging && snapReady
    const s = el.wrap.style
    s.transformOrigin = `${p.cx}px ${p.cy}px`
    s.transform = `translate(${t.x}px, ${t.y}px) rotate(${t.rot}deg) scale(${isDragging ? 1.06 : 1})`
    s.transition = isDragging ? "none" : "transform 0.45s cubic-bezier(.2,.9,.25,1.3)"
    s.zIndex = String(isLocked ? 1 : 100 + (z[i] ?? 0))
    s.filter = isLocked
      ? "none"
      : `drop-shadow(0 ${isDragging ? 10 : 5}px ${isDragging ? 16 : 9}px rgba(0,0,0,0.4))`
    el.clip.style.pointerEvents = isLocked ? "none" : "auto"
    el.clip.style.cursor = isDragging ? "grabbing" : "grab"
    el.halo.setAttribute("stroke-width", String(isLocked ? 2 : 3))
    el.stroke.setAttribute(
      "stroke",
      isSnapping ? "#2d8f5a" : isLocked ? "rgba(0,0,0,0.28)" : "rgba(20,20,30,0.7)",
    )
    el.stroke.setAttribute("stroke-width", String(isSnapping ? 2.4 : isLocked ? 1 : 1.4))
  }
  const paintAll = () => pieces.forEach((_, i) => paint(i))

  /** overlay に差し込んだ DOM をすべて外す。 */
  const clearDom = () => {
    defsSvg?.remove()
    guideSvg?.remove()
    for (const el of pieceEls) el.wrap.remove()
    defsSvg = null
    guideSvg = null
    pieceEls = []
  }

  /** 現在のジオメトリで overlay の DOM を作りなおす (状態の配列はそのまま)。 */
  const buildDom = () => {
    clearDom()
    if (pieces.length === 0) return

    // clipPath の定義。ピースごとに 1 つ。
    defsSvg = svg("svg", { width: 0, height: 0, "aria-hidden": "true" })
    defsSvg.style.position = "absolute"
    const defs = svg("defs")
    pieces.forEach((p, i) => {
      const cp = svg("clipPath", { id: `${uid}-p${i}`, clipPathUnits: "userSpaceOnUse" })
      cp.appendChild(svg("path", { d: p.d }))
      defs.appendChild(cp)
    })
    defsSvg.appendChild(defs)
    overlay.appendChild(defsSvg)

    // 配置ガイド: 各ピースの目標位置に薄いシルエットを表示し、どこに
    // 収まるかが分かるようにする。完成すると非表示になる。
    guideSvg = svg("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, "aria-hidden": "true" })
    Object.assign(guideSvg.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "0",
    })
    guideSvg.appendChild(
      svg("rect", {
        x: 0.5,
        y: 0.5,
        width: Math.max(0, w - 1),
        height: Math.max(0, h - 1),
        fill: "rgba(0,0,0,0.04)",
        stroke: "rgba(0,0,0,0.25)",
        "stroke-width": 1,
      }),
    )
    for (const p of pieces) {
      guideSvg.appendChild(
        svg("path", {
          d: p.d,
          fill: "none",
          stroke: "rgba(0,0,0,0.16)",
          "stroke-width": 1,
          "stroke-dasharray": "3 4",
        }),
      )
    }
    overlay.appendChild(guideSvg)

    // ピースごとにクリップしたページのコピー 1 つと、その輪郭線。
    pieceEls = pieces.map((p, i) => {
      // 外側のラッパーは transform だけを担い、ポインターイベントは
      // 受け取らない（フルサイズの矩形だから）。ヒットテストは、形状が
      // ピース形状と一致する下のクリップ済みレイヤーで行う。
      const wrap = document.createElement("div")
      wrap.dataset.jigsawPiece = String(i)
      Object.assign(wrap.style, {
        position: "absolute",
        inset: "0",
        width: `${w}px`,
        height: `${h}px`,
        pointerEvents: "none",
      })

      // クリップされたページの内容。clip-path はヒットテストもクリップ
      // するので、実際のピース形状だけがポインターを受け取り、外側の
      // クリックは下にある実際のピースへ素通りする。
      const clip = document.createElement("div")
      Object.assign(clip.style, { position: "absolute", inset: "0" })
      clip.style.setProperty("clip-path", `url(#${uid}-p${i})`)
      clip.style.setProperty("-webkit-clip-path", `url(#${uid}-p${i})`)
      clip.addEventListener("pointerdown", (e) => onPiecePointerDown(i, e))
      const inner = document.createElement("div")
      Object.assign(inner.style, { pointerEvents: "none", userSelect: "none" })
      inner.appendChild(cloneContent())
      clip.appendChild(inner)

      // ピースの輪郭線（縁取り）: 明るいハロー + 暗い線を上に描く
      const outlineSvg = svg("svg", {
        width: w,
        height: h,
        viewBox: `0 0 ${w} ${h}`,
        "aria-hidden": "true",
      })
      Object.assign(outlineSvg.style, { position: "absolute", inset: "0", pointerEvents: "none" })
      const halo = svg("path", {
        d: p.d,
        fill: "none",
        stroke: "rgba(255,255,255,0.9)",
        "stroke-linejoin": "round",
      })
      const stroke = svg("path", { d: p.d, fill: "none", "stroke-linejoin": "round" })
      outlineSvg.append(halo, stroke)

      wrap.append(clip, outlineSvg)
      overlay.appendChild(wrap)
      return { wrap, clip, inner, outlineSvg, halo, stroke }
    })
    paintAll()
  }

  // ---------------------------------------------------------------- 操作

  const shuffle = () => {
    const n = pieces.length
    if (n === 0 || destroyed) return
    const cw = w / cols
    const ch = h / rows
    const pad = Math.min(cw, ch) * 0.5
    locked = pieces.map(() => false)
    transforms = pieces.map((p) => {
      const tx = pad + Math.random() * (w - 2 * pad)
      const ty = pad + Math.random() * (h - 2 * pad)
      return { x: tx - p.cx, y: ty - p.cy, rot: 0 }
    })
    paintAll()
    publish()
  }

  const solve = () => {
    if (destroyed) return
    transforms = pieces.map(() => ZERO)
    locked = pieces.map(() => true)
    paintAll()
    publish()
  }

  /** 計測したサイズに合わせてピースを作りなおす。ピース数が変わったときだけ初期化する。 */
  const layout = (nw: number, nh: number) => {
    if (destroyed || (nw === w && nh === h)) return
    const prevN = pieces.length
    w = nw
    h = nh
    // リサイズ中のドラッグは打ち切る (ジオメトリが変わるため)。
    dragging = null
    snapReady = false
    pieces = w > 0 && h > 0 ? buildJigsawPieces(w, h, rows, cols, seed) : []
    const n = pieces.length
    const reinit = n !== prevN && n > 0
    if (reinit) {
      // ピース数が変わるたびに（リサイズ / 切り直し）初期化（再初期化）する。
      // まず完成位置に置き、描画を確定させてから散らすので、ばらける様子がアニメーションする。
      z = Array.from({ length: n }, () => 0)
      zTop = 1
      transforms = Array.from({ length: n }, () => ZERO)
      locked = Array.from({ length: n }, () => !scattered)
    }
    buildDom()
    if (reinit && scattered) {
      void root.offsetWidth // 完成位置のスタイルを確定させる (transition の起点)
      shuffle()
    } else {
      publish()
    }
  }

  // ---------------------------------------------------------------- ドラッグ

  const onPiecePointerDown = (i: number, e: PointerEvent) => {
    if (!draggable || locked[i] || destroyed) return
    e.preventDefault()
    const t = transforms[i] ?? ZERO
    dragging = { i, px: e.clientX, py: e.clientY, ox: t.x, oy: t.y, x: t.x, y: t.y }
    z[i] = zTop++
    paint(i)
    store.patch({ dragging: i })
  }

  // グローバルなポインターハンドラ: ドラッグし、離したときにスナップして固定する。
  const onMove = (e: PointerEvent) => {
    const d = dragging
    if (!d) return
    const nx = d.ox + (e.clientX - d.px)
    const ny = d.oy + (e.clientY - d.py)
    d.x = nx
    d.y = ny
    transforms[d.i] = { x: nx, y: ny, rot: 0 }
    setSnapReady(Math.hypot(nx, ny) <= snapDist())
    paint(d.i)
  }
  const release = (allowSnap: boolean) => {
    const d = dragging
    dragging = null
    snapReady = false
    if (!d) return
    if (allowSnap && Math.hypot(d.x, d.y) <= snapDist()) {
      playClick()
      transforms[d.i] = ZERO
      locked[d.i] = true
    }
    paint(d.i)
    publish()
  }
  const onUp = () => release(true)
  // ポインターが取り上げられた (タッチのスクロール開始など) ときは、はめずに放す。
  const onCancel = () => release(false)

  if (draggable) {
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onCancel)
  }

  // ---------------------------------------------------------------- 計測と内容の追従

  // ピースのジオメトリが実際の描画領域と一致するようホスト要素を計測する。
  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(([entry]) => {
          if (!entry) return
          const { width, height } = entry.contentRect
          layout(width, height)
        })
      : null
  ro?.observe(root)

  // 包んだ内容が変わったら (React / Vue の再描画など) ピースの中の複製を作りなおす。
  let recloneFrame = 0
  const mo =
    typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => {
          if (recloneFrame) return
          recloneFrame = requestAnimationFrame(() => {
            recloneFrame = 0
            if (destroyed) return
            for (const el of pieceEls) el.inner.replaceChildren(cloneContent())
          })
        })
      : null
  mo?.observe(content, { subtree: true, childList: true, characterData: true, attributes: true })

  // 初回は同期的に測る (ResizeObserver の通知を待たずに描けるように)。
  layout(root.clientWidth, root.clientHeight)

  return {
    get: store.get,
    subscribe: store.subscribe,
    shuffle,
    solve,
    setSound(on) {
      sound = on
    },
    transformOf: (i) => transforms[i] ?? ZERO,
    destroy() {
      if (destroyed) return
      destroyed = true
      ro?.disconnect()
      mo?.disconnect()
      if (recloneFrame) cancelAnimationFrame(recloneFrame)
      recloneFrame = 0
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onCancel)
      dragging = null
      clearDom()
      restoreContent()
      restoreRoot()
      if (audio) void audio.close().catch(() => {})
      audio = null
    },
  }
}
