import type { ReactNode } from "react"
import { ShatterGlass } from "@/components/effects/ShatterGlass"

// クリックした所からガラスのように割る。破片はドラッグでき、「元に戻す」で直る。
export function Fragile({ children }: { children: ReactNode }) {
  return (
    <ShatterGlass spokes={16} rings={4} jitter={0.5} onShatter={() => console.log("💥")}>
      {children}
    </ShatterGlass>
  )
}
