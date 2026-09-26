import { ShatterGlass } from "@hc/mui"
import { DemoPage } from "./DemoPage"

export const meta = { slug: "shatter", label: "💥 ガラス割れ", order: 2 }

export default function ShatterDemo() {
  return (
    <ShatterGlass onShatter={() => console.log("smash! 💥")}>
      <DemoPage hint="どこかをクリックすると、その場所からガラスのように割れます。" />
    </ShatterGlass>
  )
}
