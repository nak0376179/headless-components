import { useLayoutEffect, useRef, type ReactNode } from "react"
import { Button, Stack } from "@mui/material"
import { useMounted, useStore } from "@hc/react"
import { createShatterGlass } from "@hc/core"

export interface ShatterGlassProps {
  children: ReactNode
  /** 効果をオフにする（子要素は通常どおりレンダリングされ、砕けない）。@default true */
  active?: boolean
  /** 放射状スポークのおおよその本数（4 の倍数に丸められる）。@default 16 */
  spokes?: number
  /** 衝撃点から端までの同心リングの数。@default 4 */
  rings?: number
  /** ひび模様の不規則さ 0–1。@default 0.5 */
  jitter?: number
  /** 砕けたあとユーザーが破片をドラッグできるようにする。@default true */
  draggable?: boolean
  /** フローティングの操作バー（落とす / 元に戻す）を表示する。@default true */
  controls?: boolean
  /** 衝撃時に合成したガラスの割れる音を鳴らす。@default true */
  sound?: boolean
  /** ガラスが砕けたときに発火する。 */
  onShatter?: () => void
}

/**
 * 任意のページを包み、クリックした地点からガラスのように割る (MUI)。
 * 破片の生成・ドラッグ・音はすべて @hc/core の createShatterGlass が持ち、ここは箱と操作バーを描くだけ。
 */
export function ShatterGlass({
  children,
  active = true,
  spokes = 16,
  rings = 4,
  jitter = 0.5,
  draggable = true,
  controls = true,
  sound = true,
  onShatter,
}: ShatterGlassProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  // コールバックは作りなおしの理由にしないよう ref 経由で最新版を呼ぶ。
  const onShatterRef = useRef(onShatter)
  useLayoutEffect(() => {
    onShatterRef.current = onShatter
  })

  const controller = useMounted(() => {
    const root = rootRef.current
    const content = contentRef.current
    const overlay = overlayRef.current
    if (!active || !root || !content || !overlay) return null
    return createShatterGlass(
      { root, content, overlay },
      { spokes, rings, jitter, draggable, sound, onShatter: () => onShatterRef.current?.() },
    )
  }, [active, spokes, rings, jitter, draggable, sound])
  const state = useStore(controller)

  // active=false のときもコントローラを作らないだけで、箱の構成は同じにする (ただの div が 2 枚)。
  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <div ref={contentRef}>{children}</div>
      <div ref={overlayRef} />
      {controls && controller && state?.shattered && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ position: "absolute", top: 12, right: 12, zIndex: 10001 }}
        >
          <Button variant="contained" onClick={() => controller.drop()} sx={pill("#0a9396")}>
            💧 落とす
          </Button>
          <Button variant="contained" onClick={() => controller.repair()} sx={pill("#2d8f5a")}>
            🔧 元に戻す
          </Button>
        </Stack>
      )}
    </div>
  )
}

/** 元実装の丸いボタン (色も同じ) に寄せる。 */
const pill = (bg: string) =>
  ({
    borderRadius: 999,
    fontWeight: 600,
    textTransform: "none",
    bgcolor: bg,
    color: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
    "&:hover": { bgcolor: bg, filter: "brightness(1.1)" },
  }) as const
