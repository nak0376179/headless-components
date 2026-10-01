import { CheatCode } from "@/components/effects/CheatCode"
import { DemoPage } from "@/demo/DemoPage"

export default function CheatCodePage() {
  return (
    <CheatCode onUnlock={() => console.log("unlocked! 🎮")}>
      <DemoPage hint="↑ ↑ ↓ ↓ ← → ← → B A と入力してみてください。" />
    </CheatCode>
  )
}
