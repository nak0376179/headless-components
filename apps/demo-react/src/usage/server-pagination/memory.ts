import { createMemorySource } from "@hc/core"
import type { Employee } from "../datatable/columns"

// API がまだ無いうちは、メモリ上の模擬 API で同じ形の fetchPage を作れる (このデモもこれ)。
export const source = createMemorySource<Employee>({
  items: [],
  getKey: (e) => e.email,
  matches: (e, search) => e.name.includes(search) || e.department.includes(search),
  latencyMs: 400, // 応答を遅らせて読み込み中の表示を確かめる
})
// <CursorTable fetchPage={source.fetchPage} … />
