import type { Component } from "vue"
import CsvJsonDemo from "./CsvJsonDemo.vue"
import EmployeesDemo from "./EmployeesDemo.vue"
import ServerPaginationDemo from "./ServerPaginationDemo.vue"

export type Demo = {
  /** URL (#slug) にもなる識別子。React 版と揃える。 */
  slug: string
  label: string
  component: Component
}

// 演出系は demos/effects/*Demo.vue を自動で拾う (各 SFC は <script> で meta を export する)。
type EffectModule = { default: Component; meta: { slug: string; label: string; order: number } }
const effectDemos: Demo[] = Object.values(
  import.meta.glob<EffectModule>("./effects/*Demo.vue", { eager: true }),
)
  .sort((a, b) => a.meta.order - b.meta.order)
  .map((m) => ({ slug: m.meta.slug, label: m.meta.label, component: m.default }))

/** デモの一覧。 */
export const demos: Demo[] = [
  ...effectDemos,
  { slug: "csv-json", label: "📋 CSV→JSON", component: CsvJsonDemo },
  { slug: "datatable", label: "📊 データテーブル", component: EmployeesDemo },
  {
    slug: "server-pagination",
    label: "🗄️ サーバページネーション",
    component: ServerPaginationDemo,
  },
]
