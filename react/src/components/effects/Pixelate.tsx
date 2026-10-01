import { useEffect, useRef, type ReactNode } from "react"
import { Box, Button, Slider } from "@mui/material"
import { useMounted } from "@/hooks/useMounted"
import { useStore } from "@/hooks/useStore"
import { createPixelate, PIXELATE_MAX_SIZE, PIXELATE_MIN_SIZE } from "@core"

export interface PixelateProps {
  children: ReactNode
  /** モザイクのブロックサイズ（px）。大きいほど粗くなる。@default 14 */
  size?: number
  /** 効果をオフにする（子要素は通常どおりレンダリングされる）。@default true */
  active?: boolean
  /** ポインター下に鮮明な円を露わにする。@default true */
  lens?: boolean
  /** 露出レンズの半径（px）。@default 90 */
  lensRadius?: number
  /** フローティングの操作バー（ブロックサイズのスライダー / 露出トグル）を表示する。@default true */
  controls?: boolean
}

/**
 * 任意のページをラップし、SVG のモザイクフィルタを通して描画する (MUI)。
 * ポインター下は円形のレンズで鮮明な元の表示が見える。
 * フィルタ生成・ポインター追跡・露出の切り替えは @core の createPixelate が持ち、
 * ここは中身を 2 つ (モザイク用 / レンズ用) 描いて、操作バーを出すだけ。
 */
export function Pixelate({
  children,
  size = 14,
  active = true,
  lens = true,
  lensRadius = 90,
  controls = true,
}: PixelateProps) {
  if (!active) return <>{children}</>
  return (
    <PixelateActive size={size} lens={lens} lensRadius={lensRadius} controls={controls}>
      {children}
    </PixelateActive>
  )
}

function PixelateActive({
  children,
  size,
  lens,
  lensRadius,
  controls,
}: Required<Omit<PixelateProps, "active">>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const lensRef = useRef<HTMLDivElement>(null)

  const controller = useMounted(() => {
    const root = rootRef.current
    const content = contentRef.current
    const lensEl = lensRef.current
    if (!root || !content || !lensEl) return null
    return createPixelate({ root, content, lens: lensEl }, { size, lens, lensRadius })
  }, [])
  const state = useStore(controller)

  useEffect(() => controller?.setSize(size), [controller, size])
  useEffect(() => controller?.setLensEnabled(lens), [controller, lens])
  useEffect(() => controller?.setLensRadius(lensRadius), [controller, lensRadius])

  const revealed = state?.revealed ?? false

  return (
    <div ref={rootRef}>
      <div ref={contentRef}>{children}</div>
      {/* レンズ用のコピー。表示・クリップはコアが切り替える (マウント前は隠しておく)。 */}
      <div ref={lensRef} aria-hidden style={{ display: "none" }}>
        {children}
      </div>

      {controls && (
        <Box
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10001,
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            py: 1,
            px: 1.5,
            borderRadius: 999,
            bgcolor: "rgba(20,20,30,0.7)",
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            🟦
            <Slider
              size="small"
              min={PIXELATE_MIN_SIZE}
              max={PIXELATE_MAX_SIZE}
              value={state?.size ?? size}
              onChange={(_, v) => controller?.setSize(v as number)}
              disabled={revealed}
              aria-label="ブロックサイズ"
              sx={{ width: 120, color: "#fff" }}
            />
          </Box>
          <Button
            size="small"
            variant="contained"
            disableElevation
            onClick={() => controller?.toggleRevealed()}
            sx={{
              borderRadius: 999,
              px: 1.5,
              fontWeight: 700,
              fontSize: 13,
              textTransform: "none",
              whiteSpace: "nowrap",
              bgcolor: revealed ? "#e8543f" : "#2d8f5a",
              "&:hover": { bgcolor: revealed ? "#d2432f" : "#247a4c" },
            }}
          >
            {revealed ? "🟦 モザイク" : "👓 解除"}
          </Button>
        </Box>
      )}
    </div>
  )
}

export default Pixelate
