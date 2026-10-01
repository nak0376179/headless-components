import { useEffect, useState } from "react"
import { createMemorySource, virtualWindow } from "@hc/core"
import { useInfiniteList } from "@hc/react"

type Message = { id: string; text: string }
const source = createMemorySource<Message>({
  items: Array.from({ length: 5000 }, (_, i) => ({ id: String(i), text: `メッセージ ${i + 1}` })),
  getKey: (m) => m.id,
})

const ROW = 56 // 1 行の高さ (一定)

// 表ではないリストにも同じ仕組みを付けられる: 読み込みは useInfiniteList、描く範囲は virtualWindow。
export function MessageList() {
  const { state, controller } = useInfiniteList({ fetchPage: source.fetchPage, pageSize: 200 })
  const [top, setTop] = useState(0)
  const win = virtualWindow({
    scrollTop: top,
    viewportHeight: 480,
    rowHeight: ROW,
    count: state.items.length,
  })

  // 下端まで残り 40 行を切ったら続きを読む (loadMore は二重には走らない)
  useEffect(() => {
    if (win.rowsBelow < 40) void controller.loadMore()
  }, [win.rowsBelow, controller])

  return (
    <div
      style={{ height: 480, overflow: "auto" }}
      onScroll={(e) => setTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: win.padTop }} />
      {state.items.slice(win.start, win.end).map((m) => (
        <div key={m.id} style={{ height: ROW }}>
          {m.text}
        </div>
      ))}
      <div style={{ height: win.padBottom }} />
      {state.loading && <p>読み込み中…</p>}
    </div>
  )
}
