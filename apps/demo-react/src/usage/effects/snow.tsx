import { useRef, type ReactNode } from "react"
import { Button } from "@mui/material"
import type { SnowfallController } from "@hc/core"
import { Snowfall } from "@hc/mui"

// ページを包むと雪が降る。data-snow-target を付けた要素の上の縁と、包んだ範囲の底に積もる。
export function WinterLogin({ children }: { children: ReactNode }) {
  const snow = useRef<SnowfallController | null>(null)
  const card = useRef<HTMLDivElement>(null)
  return (
    <Snowfall
      controllerRef={snow}
      intensity={90} // 1 秒・幅 1000px あたりの粒の数
      wind={18} // 正で右へ流れる
      maxDepth={24} // 積もる深さの上限 (px)
      controls={false} // 右上の操作パネルを出さない
    >
      {children}
      <div
        ref={card}
        data-snow-target
        style={{ width: 360, margin: "80px auto", padding: 32, background: "#fff" }}
      >
        ここに積もる
        {/* 押すとこの要素の雪だけを払い落とす (省略すると全部) */}
        <Button onClick={() => card.current && snow.current?.shake(card.current)}>払う</Button>
        <Button onClick={() => snow.current?.melt()}>溶かす</Button>
      </div>
    </Snowfall>
  )
}
