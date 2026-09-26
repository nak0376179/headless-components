import { JigsawPuzzle } from "@hc/mui"
import { DemoPage } from "./DemoPage"

export const meta = { slug: "jigsaw", label: "🧩 ジグソー", order: 1 }

export default function JigsawDemo() {
  return (
    <JigsawPuzzle rows={4} cols={6} onSolved={() => console.log("solved! 🎉")}>
      <DemoPage hint="ピースをドラッグして元の位置に戻すと、カチッとはまります。" />
    </JigsawPuzzle>
  )
}
