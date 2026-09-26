import { useLayoutEffect, useRef, type ReactNode } from "react"
import { Box, Button, Typography } from "@mui/material"
import {
  CHEAT_POP_ANIMATION,
  CHEAT_SECRET_Z_INDEX,
  CHEAT_SEQUENCE,
  createCheatCode,
} from "@hc/core"
import { useMounted, useStore } from "@hc/react"

export interface CheatCodeProps {
  children: ReactNode
  /** 解除されたときに表示する内容。デフォルトはお祝いのバナー。 */
  secret?: ReactNode
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

/**
 * 隠しコマンド (↑ ↑ ↓ ↓ ← → ← → B A) で解除されるイースターエッグ (MUI)。
 * キー照合・効果音・紙吹雪・きらめきは @hc/core の createCheatCode が持ち、ここは
 * host 要素と秘密のバナーを描くだけ。子要素はそのまま描画される。
 */
export function CheatCode({
  children,
  secret,
  code = CHEAT_SEQUENCE,
  confetti = true,
  shimmer = true,
  sound = true,
  sticky = false,
  onUnlock,
}: CheatCodeProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // onUnlock は作りなおさずに最新版を呼ぶ。
  const onUnlockRef = useRef(onUnlock)
  useLayoutEffect(() => {
    onUnlockRef.current = onUnlock
  })

  const options = {
    code,
    confetti,
    shimmer,
    sound,
    sticky,
    onUnlock: () => onUnlockRef.current?.(),
  }
  const controller = useMounted(() => {
    const root = rootRef.current
    const content = contentRef.current
    const overlay = overlayRef.current
    if (!root || !content || !overlay) return null
    return createCheatCode({ root, content, overlay }, options)
  }, [])
  // props の差し替えはコントローラを作りなおさずに反映する (code が変われば進み具合はリセット)。
  useLayoutEffect(() => {
    controller?.setOptions(options)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options は下の値から作る
  }, [controller, code.join("\u0000"), confetti, shimmer, sound, sticky])

  const state = useStore(controller)

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <div ref={contentRef}>{children}</div>
      {/* 紙吹雪のレイヤー (中身とスタイルはコントローラが管理する) */}
      <div ref={overlayRef} />

      {/* 秘密のコンテンツ */}
      {state?.unlocked && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: CHEAT_SECRET_Z_INDEX,
          }}
        >
          <Box sx={{ pointerEvents: "auto", animation: CHEAT_POP_ANIMATION }}>
            {secret ?? <DefaultSecret onClose={() => controller?.close()} />}
          </Box>
        </Box>
      )}
    </div>
  )
}

/** デフォルトのお祝いバナー。 */
function DefaultSecret({ onClose }: { onClose: () => void }) {
  return (
    <Box
      role="dialog"
      aria-label="隠しコマンド成功"
      sx={{
        px: "36px",
        py: "28px",
        borderRadius: "20px",
        bgcolor: "rgba(20,20,30,0.9)",
        color: "#fff",
        textAlign: "center",
        boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
        maxWidth: 360,
      }}
    >
      <Box sx={{ fontSize: 44, lineHeight: 1.2 }}>🎉</Box>
      <Typography sx={{ fontSize: 24, fontWeight: 800, my: "6px" }}>残機 30 機 解除！</Typography>
      <Typography sx={{ opacity: 0.8, fontSize: 14 }}>
        隠しコマンド成功。<code>secret</code> prop で中身を差し替えられます。
      </Typography>
      <Button
        variant="contained"
        disableElevation
        onClick={onClose}
        sx={{
          mt: "18px",
          px: "18px",
          borderRadius: 999,
          bgcolor: "#6a5cff",
          fontWeight: 700,
          textTransform: "none",
          "&:hover": { bgcolor: "#5747f0" },
        }}
      >
        閉じる (Esc)
      </Button>
    </Box>
  )
}

export default CheatCode
