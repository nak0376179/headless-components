import { useImperativeHandle, useRef, type ReactNode, type Ref } from "react"
import { Button, Paper, Slider, Stack, Typography } from "@mui/material"
import { useMounted } from "@/hooks/useMounted"
import { useStore } from "@/hooks/useStore"
import { createSnowfall, type SnowfallController } from "@core"

export interface SnowfallProps {
  children: ReactNode
  /** 効果をオフにする (子要素は通常どおり表示される)。@default true */
  active?: boolean
  /** 降る量 (1 秒・幅 1000px あたりの粒の数)。@default 70 */
  intensity?: number
  /** 風 (px/秒。正で右へ)。@default 15 */
  wind?: number
  /** 積もらせる。@default true */
  accumulate?: boolean
  /** 積もる深さの上限 (px)。@default 24 */
  maxDepth?: number
  /** root の底 (地面) にも積もらせる。@default true */
  ground?: boolean
  /** 右上の操作パネル (強さ・風・払う・溶かす)。@default true */
  controls?: boolean
  /** コントローラ (shake / melt など) を外から使うとき。 */
  controllerRef?: Ref<SnowfallController | null>
}

/**
 * 包んだページに雪を降らせ、`data-snow-target` を付けた要素の上の縁と地面に積もらせる (MUI)。
 * 降る・積もる・崩れる・払い落とすはすべて @core の createSnowfall が持ち、ここは箱と操作パネルを描くだけ。
 */
export function Snowfall({
  children,
  active = true,
  intensity = 70,
  wind = 15,
  accumulate = true,
  maxDepth = 24,
  ground = true,
  controls = true,
  controllerRef,
}: SnowfallProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controller = useMounted(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!active || !root || !canvas) return null
    return createSnowfall({ root, canvas }, { intensity, wind, accumulate, maxDepth, ground })
    // 強さと風は作り直さずに setIntensity / setWind で変える
  }, [active, accumulate, maxDepth, ground])
  useImperativeHandle(controllerRef, () => controller as SnowfallController, [controller])
  const state = useStore(controller)

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      {children}
      <canvas ref={canvasRef} aria-hidden />
      {controls && controller && state && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10,
            p: 1.5,
            width: 220,
            bgcolor: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(6px)",
            color: "#123",
          }}
        >
          <Typography variant="caption">❄️ 降る量</Typography>
          <Slider
            size="small"
            min={0}
            max={300}
            value={state.intensity}
            onChange={(_, v) => controller.setIntensity(v as number)}
          />
          <Typography variant="caption">🌬️ 風</Typography>
          <Slider
            size="small"
            min={-120}
            max={120}
            value={state.wind}
            onChange={(_, v) => controller.setWind(v as number)}
          />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => controller.shake()}>
              払う
            </Button>
            <Button size="small" onClick={() => controller.melt()}>
              溶かす
            </Button>
          </Stack>
        </Paper>
      )}
    </div>
  )
}
