import type { ReactNode } from "react"
import { JigsawPuzzle } from "@hc/mui"

// 包んだページをジグソーパズルのピースに切り分けて散らす。元の位置に戻すとはまる。
export function April1st({ children }: { children: ReactNode }) {
  return (
    <JigsawPuzzle
      rows={4}
      cols={6}
      seed={42} // 散らし方を固定する (省略すると毎回ちがう)
      sound // はまるときに合成音を鳴らす
      onSolved={() => console.log("solved! 🎉")}
    >
      {children}
    </JigsawPuzzle>
  )
}
