import type { ReactNode } from "react"
import { CsvJsonDemo } from "./CsvJsonDemo"
import { EmployeesDemo } from "./EmployeesDemo"
import { ServerPaginationDemo } from "./ServerPaginationDemo"

export type Demo = {
  /** URL (#slug) にもなる識別子。Vue 版と揃える。 */
  slug: string
  label: string
  render: () => ReactNode
}

// 演出系は demos/effects/*Demo.tsx を自動で拾う (各ファイルは meta と default を export する)。
type EffectModule = {
  default: () => ReactNode
  meta: { slug: string; label: string; order: number }
}
const effectDemos: Demo[] = Object.values(
  import.meta.glob<EffectModule>("./effects/*Demo.tsx", { eager: true }),
)
  .sort((a, b) => a.meta.order - b.meta.order)
  .map((m) => ({ slug: m.meta.slug, label: m.meta.label, render: () => <m.default /> }))

/** デモの一覧。 */
export const demos: Demo[] = [
  ...effectDemos,
  { slug: "csv-json", label: "📋 CSV→JSON", render: () => <CsvJsonDemo /> },
  { slug: "datatable", label: "📊 データテーブル", render: () => <EmployeesDemo /> },
  {
    slug: "server-pagination",
    label: "🗄️ サーバページネーション",
    render: () => <ServerPaginationDemo />,
  },
]
