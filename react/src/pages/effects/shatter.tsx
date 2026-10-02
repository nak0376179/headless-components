import { ShatterGlass } from "@/components/draft/effects/ShatterGlass"
import { DemoPage } from "@/demo/DemoPage"

export default function ShatterPage() {
  return (
    <ShatterGlass onShatter={() => console.log("smash! 💥")}>
      <DemoPage hint="どこかをクリックすると、その場所からガラスのように割れます。" />
    </ShatterGlass>
  )
}
