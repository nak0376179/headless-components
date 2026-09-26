import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react"
import { Box, Button, Chip, Stack } from "@mui/material"
import { useMounted, useStore } from "@hc/react"
import { createJigsaw } from "@hc/core"

export interface JigsawPuzzleProps {
  children: ReactNode
  /** パズルの行数。@default 4 */
  rows?: number
  /** パズルの列数。@default 6 */
  cols?: number
  /** 効果のオン/オフ。オフのとき子要素は通常どおりレンダリングされる。@default true */
  active?: boolean
  /** ピースをシャッフルした状態でゲームを開始する。@default true */
  scattered?: boolean
  /** ユーザーがピースをドラッグできるようにする。@default true */
  draggable?: boolean
  /** フローティングの操作バー（Shuffle / Solve / 進捗）を表示する。@default true */
  controls?: boolean
  /** パズルの切り方を変える。@default 1 */
  seed?: number
  /** ピースが定位置にはまったときに合成したクリック音を鳴らす。@default true */
  sound?: boolean
  /** すべてのピースが定位置に固定されたときに一度だけ発火する。 */
  onSolved?: () => void
}

/**
 * 包んだ内容をジグソーパズルにする演出 (MUI)。
 * ピースの生成・ドラッグ・スナップ・効果音は @hc/core の createJigsaw が持ち、
 * ここは host 構造と操作バー (進捗・シャッフル・そろえる) とクリア表示を描くだけ。
 */
export function JigsawPuzzle({
  children,
  rows = 4,
  cols = 6,
  active = true,
  scattered = true,
  draggable = true,
  controls = true,
  seed = 1,
  sound = true,
  onSolved,
}: JigsawPuzzleProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // onSolved は作りなおしの deps に入れず、最新版を ref 経由で呼ぶ。
  const onSolvedRef = useRef(onSolved)
  useLayoutEffect(() => {
    onSolvedRef.current = onSolved
  })

  const controller = useMounted(() => {
    const root = rootRef.current
    const content = contentRef.current
    const overlay = overlayRef.current
    if (!active || !root || !content || !overlay) return null
    return createJigsaw(
      { root, content, overlay },
      { rows, cols, seed, scattered, draggable, sound, onSolved: () => onSolvedRef.current?.() },
    )
    // sound は setSound で切り替えるので deps に入れない (パズルがばらけ直さないように)。
  }, [active, rows, cols, seed, scattered, draggable])
  useEffect(() => controller?.setSound(sound), [controller, sound])

  const state = useStore(controller)

  return (
    <div ref={rootRef}>
      <div ref={contentRef}>{children}</div>
      <div ref={overlayRef} />

      {/* クリア時のバナー */}
      {state?.solved && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: 10000,
          }}
        >
          <Box
            sx={{
              px: 3.5,
              py: 2,
              borderRadius: 4,
              bgcolor: "rgba(20,20,30,0.82)",
              color: "#fff",
              fontFamily: "system-ui, sans-serif",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 1,
              boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
            }}
          >
            🎉 クリア！
          </Box>
        </Box>
      )}

      {controller && state && controls && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ position: "absolute", top: 12, right: 12, zIndex: 10001, alignItems: "center" }}
        >
          <Chip
            size="small"
            label={`${state.placed} / ${state.total}`}
            sx={{ bgcolor: "rgba(20,20,30,0.7)", color: "#fff", fontWeight: 600 }}
          />
          <Button variant="contained" onClick={controller.shuffle} sx={pill("#e8543f")}>
            🔀 シャッフル
          </Button>
          <Button variant="contained" onClick={controller.solve} sx={pill("#2d8f5a")}>
            🧩 そろえる
          </Button>
        </Stack>
      )}
    </div>
  )
}

/** 丸い色付きボタン (元のデザインの色をそのまま使う)。 */
function pill(bg: string) {
  return {
    borderRadius: 999,
    bgcolor: bg,
    color: "#fff",
    fontWeight: 600,
    textTransform: "none",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
    "&:hover": { bgcolor: bg, filter: "brightness(1.08)" },
  } as const
}

export default JigsawPuzzle
