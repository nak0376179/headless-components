import { Pixelate } from "@hc/mui"
import { DemoPage } from "./DemoPage"

export const meta = { slug: "pixelate", label: "🟦 モザイク", order: 4 }

export default function PixelateDemo() {
  return (
    <Pixelate>
      <DemoPage hint="マウスを乗せると、その下だけくっきり見えます。" />
    </Pixelate>
  )
}
