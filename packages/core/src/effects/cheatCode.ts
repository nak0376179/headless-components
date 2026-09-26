// CheatCode — 定番の隠しイースターエッグのヘッドレスなコントローラ。
//
// 任意のページを包み、秘密のキー入力 (有名な ↑ ↑ ↓ ↓ ← → ← → B A) を打ち込むと解除される。
// 紙吹雪が舞い、ページ全体に虹色のきらめきがかかり、秘密の中身 (バナー) が表示される。`Esc` で閉じる。
//
// ここが持つのは振る舞いだけ: キー列の照合・状態 (解除中か / 進み具合)・Web Audio の合成音・
// 紙吹雪 (overlay 要素に span を直接生やす)・きらめき (content 要素に animation を当てる)。
// 秘密のバナーそのものは UI 側 (MUI / Vuetify) が state.unlocked を見て描く。
//
// 子要素 (content の中身) には一切触らないので、実際のページを囲んでも安全。
// destroy() で window の keydown リスナー・タイマー・生やしたノード・<style>・AudioContext をすべて片付ける。
import { createStore, type ReadableStore } from "../store"

/** 正式なキー入力シーケンス (KeyboardEvent.key の値を使用)。 */
export const CHEAT_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const

/** 紙吹雪の色。 */
export const CHEAT_CONFETTI_COLORS = [
  "#e8543f",
  "#ca6702",
  "#2d8f5a",
  "#0a9396",
  "#6a5cff",
  "#00c2ff",
  "#ee9b00",
]

/** 秘密のバナーを出すときに UI 側で当てるアニメーション (keyframes はコントローラが注入する)。 */
export const CHEAT_POP_ANIMATION = "hc-cheat-pop 0.5s cubic-bezier(.2,.9,.25,1.4)"

/** 秘密のバナーを載せるレイヤーの z-index (紙吹雪の 1 つ上)。 */
export const CHEAT_SECRET_Z_INDEX = 100001

const CONFETTI_Z_INDEX = 100000
const CONFETTI_COUNT = 80
/** 紙吹雪を片付けるまでの時間 (最長の落下 = 遅延 0.6s + 4.0s を少し越える)。 */
const CONFETTI_LIFETIME_MS = 4200
const SHIMMER_ANIMATION = "hc-cheat-shimmer 1.2s ease-in-out"

const KEYFRAMES = `
@keyframes hc-cheat-fall {
  to { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
}
@keyframes hc-cheat-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
@keyframes hc-cheat-shimmer {
  0%, 100% { filter: none; }
  50% { filter: hue-rotate(320deg) saturate(1.6); }
}
`

export interface CheatCodeState {
  /** 解除中か (秘密のバナーを出すか)。 */
  unlocked: boolean
  /** いま何キー目まで合っているか (0〜length-1)。 */
  progress: number
  /** キー列の長さ。 */
  length: number
  /** 紙吹雪が舞っている最中か。 */
  bursting: boolean
}

export interface CheatCodeOptions {
  /** キー入力シーケンスを上書きする (KeyboardEvent.key の値、大文字小文字は無視)。 */
  code?: readonly string[]
  /** 解除時に紙吹雪を降らせる。@default true */
  confetti?: boolean
  /** 解除時にページ全体へ短い虹色のきらめきをかける。@default true */
  shimmer?: boolean
  /** 解除時に合成したパワーアップ音を鳴らす。@default true */
  sound?: boolean
  /** 2 回目の入力で解除を切り替えず、解除したままにする。@default false */
  sticky?: boolean
  /** コードが完成するたびに発火する。 */
  onUnlock?: () => void
}

export interface CheatCodeElements {
  /** 包んでいるページ (きらめきの animation を当てる)。 */
  content: HTMLElement
  /** 紙吹雪を生やす要素。画面全体を覆う fixed レイヤーにする (コントローラがスタイルを当てる)。 */
  overlay: HTMLElement
  /** keyframes の <style> を置く場所。省略時は overlay の親 (無ければ document.head)。 */
  root?: HTMLElement
}

export interface CheatCodeController extends ReadableStore<CheatCodeState> {
  /** キーを 1 つ入力したものとして扱う (window の keydown もこれを呼ぶ)。 */
  press(key: string): void
  /** コードが完成したときと同じ演出を起こす (sticky でなければ解除 / 解除中は閉じる)。 */
  trigger(): void
  /** 秘密を閉じ、入力の進み具合も最初に戻す (Esc と同じ)。 */
  close(): void
  /** オプションを差し替える。code が変わったら進み具合をリセットする。 */
  setOptions(options: CheatCodeOptions): void
  /** 生やしたもの (リスナー・タイマー・ノード・スタイル・AudioContext) をすべて片付ける。 */
  destroy(): void
}

type Resolved = Required<Omit<CheatCodeOptions, "onUnlock">> & Pick<CheatCodeOptions, "onUnlock">

const resolve = (o: CheatCodeOptions): Resolved => ({
  code: o.code ?? CHEAT_SEQUENCE,
  confetti: o.confetti ?? true,
  shimmer: o.shimmer ?? true,
  sound: o.sound ?? true,
  sticky: o.sticky ?? false,
  onUnlock: o.onUnlock,
})

/**
 * 入力済みの `progress` キーに `key` を足したとき、次に何キー目から続けられるか。
 * 一致しなくても、打った列の末尾がコードの先頭と重なっていればそこから続ける
 * (例: ↑ ↑ ↑ ↓ ↓ … でも、最後の ↑ ↑ を先頭とみなして完成できる)。
 */
export function advanceCheatProgress(
  wanted: readonly string[],
  progress: number,
  key: string,
): number {
  if (key === wanted[progress]) return progress + 1
  // 入力列 = wanted[0..progress) + key。その最長の「末尾 = 先頭」を探す。
  const typed = [...wanted.slice(0, progress), key]
  for (let k = Math.min(progress, wanted.length - 1); k > 0; k--) {
    let ok = true
    for (let i = 0; i < k; i++) {
      if (typed[typed.length - k + i] !== wanted[i]) {
        ok = false
        break
      }
    }
    if (ok) return k
  }
  return 0
}

export function createCheatCode(
  elements: CheatCodeElements,
  options: CheatCodeOptions = {},
): CheatCodeController {
  const { content, overlay } = elements
  let opts = resolve(options)
  let wanted = opts.code.map((k) => k.toLowerCase())
  let destroyed = false

  const store = createStore<CheatCodeState>({
    unlocked: false,
    progress: 0,
    length: wanted.length,
    bursting: false,
  })

  // keyframes はこのインスタンスが生きている間だけ置く (destroy で外す)。
  const style = document.createElement("style")
  style.textContent = KEYFRAMES
  const styleHost = elements.root ?? overlay.parentElement ?? document.head
  styleHost.appendChild(style)

  // overlay を画面全体の透明なレイヤーにする (元のスタイルは destroy で戻す)。
  const prevOverlayStyle = overlay.getAttribute("style")
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: String(CONFETTI_Z_INDEX),
  })
  overlay.setAttribute("aria-hidden", "true")
  const prevContentAnimation = content.style.animation

  // ---------------------------------------------------------------- 効果音
  // 解除音用に遅延生成する AudioContext (音源ファイル不要の合成音)。
  let audio: AudioContext | null = null
  const playJingle = () => {
    if (!opts.sound) return
    if (!audio) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      try {
        audio = new AC()
      } catch {
        return
      }
    }
    const ctx = audio
    if (ctx.state === "suspended") void ctx.resume()
    // 1UP 風に上昇するアルペジオ。
    ;[659, 784, 988, 1319].forEach((freq, k) => {
      const t = ctx.currentTime + k * 0.08
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = "square"
      osc.frequency.setValueAtTime(freq, t)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      osc.connect(g).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.18)
    })
  }

  // ---------------------------------------------------------------- 紙吹雪
  let burstTimer: number | undefined
  const clearBurst = () => {
    window.clearTimeout(burstTimer)
    burstTimer = undefined
    overlay.replaceChildren()
    store.patch({ bursting: false })
  }
  const burst = () => {
    // 新しい紙吹雪で置き換える (前のタイマーは捨てる)。
    window.clearTimeout(burstTimer)
    const frag = document.createDocumentFragment()
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const size = 6 + Math.random() * 8
      const piece = document.createElement("span")
      Object.assign(piece.style, {
        position: "absolute",
        top: "-20px",
        left: `${Math.random() * 100}vw`,
        width: `${size}px`,
        height: `${size * 0.6}px`,
        background: CHEAT_CONFETTI_COLORS[i % CHEAT_CONFETTI_COLORS.length],
        borderRadius: "2px",
        transform: `rotate(${Math.random() * 360}deg)`,
        animation: `hc-cheat-fall ${2.4 + Math.random() * 1.6}s linear ${Math.random() * 0.6}s forwards`,
      })
      frag.appendChild(piece)
    }
    overlay.replaceChildren(frag)
    store.patch({ bursting: true })
    burstTimer = window.setTimeout(clearBurst, CONFETTI_LIFETIME_MS)
  }

  // ---------------------------------------------------------------- 状態遷移
  const setUnlocked = (unlocked: boolean) => {
    // きらめきは解除した瞬間に 1 回だけ。閉じたら外す (次の解除でまた再生される)。
    content.style.animation = unlocked && opts.shimmer ? SHIMMER_ANIMATION : prevContentAnimation
    store.patch({ unlocked })
  }

  const trigger = () => {
    if (destroyed) return
    setUnlocked(opts.sticky ? true : !store.get().unlocked)
    playJingle()
    if (opts.confetti) burst()
    opts.onUnlock?.()
  }

  const close = () => {
    if (destroyed) return
    store.patch({ progress: 0 })
    if (store.get().unlocked) setUnlocked(false)
  }

  const press = (rawKey: string) => {
    if (destroyed) return
    if (rawKey === "Escape") return close()
    const next = advanceCheatProgress(wanted, store.get().progress, rawKey.toLowerCase())
    if (next === wanted.length) {
      store.patch({ progress: 0 })
      trigger()
    } else {
      store.patch({ progress: next })
    }
  }

  const onKey = (e: KeyboardEvent) => {
    // IME 変換中などで key が無いイベントは無視する。
    if (typeof e.key === "string" && e.key) press(e.key)
  }
  window.addEventListener("keydown", onKey)

  return {
    get: store.get,
    subscribe: store.subscribe,
    press,
    trigger,
    close,
    setOptions(next) {
      const prevCode = wanted.join("\u0000")
      opts = resolve(next)
      wanted = opts.code.map((k) => k.toLowerCase())
      if (wanted.join("\u0000") !== prevCode) store.patch({ progress: 0, length: wanted.length })
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      window.removeEventListener("keydown", onKey)
      window.clearTimeout(burstTimer)
      overlay.replaceChildren()
      if (prevOverlayStyle === null) overlay.removeAttribute("style")
      else overlay.setAttribute("style", prevOverlayStyle)
      overlay.removeAttribute("aria-hidden")
      content.style.animation = prevContentAnimation
      style.remove()
      void audio?.close().catch(() => {})
      audio = null
      store.patch({ unlocked: false, progress: 0, bursting: false })
    },
  }
}
