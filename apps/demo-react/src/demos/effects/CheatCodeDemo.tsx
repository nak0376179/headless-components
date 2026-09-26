import { CheatCode } from "@hc/mui"
import { DemoPage } from "./DemoPage"

export const meta = { slug: "cheat-code", label: "🎮 隠しコマンド", order: 3 }

export default function CheatCodeDemo() {
  return (
    <CheatCode onUnlock={() => console.log("unlocked! 🎮")}>
      <DemoPage hint="↑ ↑ ↓ ↓ ← → ← → B A と入力してみてください。" />
    </CheatCode>
  )
}
