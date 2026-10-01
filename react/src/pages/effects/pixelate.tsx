import { Pixelate } from "@/components/effects/Pixelate"
import { DemoPage } from "@/demo/DemoPage"

export default function PixelatePage() {
  return (
    <Pixelate>
      <DemoPage hint="マウスを乗せると、その下だけくっきり見えます。" />
    </Pixelate>
  )
}
