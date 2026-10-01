import { JigsawPuzzle } from "@/components/effects/JigsawPuzzle"
import { DemoPage } from "@/demo/DemoPage"

export default function JigsawPage() {
  return (
    <JigsawPuzzle rows={4} cols={6} onSolved={() => console.log("solved! 🎉")}>
      <DemoPage hint="ピースをドラッグして元の位置に戻すと、カチッとはまります。" />
    </JigsawPuzzle>
  )
}
