import type { ReactNode } from "react"
import { CheatCode } from "@/components/draft/effects/CheatCode"

// ↑↑↓↓←→←→BA (コナミコマンド) を入力すると紙吹雪と秘密のバナーを出す。
export function EasterEgg({ children }: { children: ReactNode }) {
  return (
    <CheatCode
      code={["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "b", "a"]} // 省略時はコナミコマンド
      secret={<strong>🎮 開発チームより愛を込めて</strong>}
      onUnlock={() => console.log("unlocked!")}
    >
      {children}
    </CheatCode>
  )
}
