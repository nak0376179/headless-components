import type { ReactNode } from "react"
import { Pixelate } from "@hc/mui"

// ページ全体をモザイクにし、ポインターの下だけ円形のレンズでくっきり見せる。
// 中身はライブ DOM のままなので、レンズ越しにボタンなどを操作できる。
export function Spoiler({ children }: { children: ReactNode }) {
  return (
    <Pixelate size={14} lensRadius={90}>
      {children}
    </Pixelate>
  )
}
