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

/** 上位タブ。`children` があるタブは下に小タブを並べる (演出系はここにまとめる)。 */
export type DemoTab = { slug: string; label: string; children: Demo[] }

/** 上位タブの一覧。先頭が既定 (#slug が無い・知らないとき開く)。 */
export const tabs: DemoTab[] = [
  {
    slug: "csv-json",
    label: "📋 CSV→JSON",
    children: [{ slug: "csv-json", label: "📋 CSV→JSON", render: () => <CsvJsonDemo /> }],
  },
  {
    slug: "datatable",
    label: "📊 データテーブル",
    children: [{ slug: "datatable", label: "📊 データテーブル", render: () => <EmployeesDemo /> }],
  },
  {
    slug: "server-pagination",
    label: "🗄️ サーバページネーション",
    children: [
      {
        slug: "server-pagination",
        label: "🗄️ サーバページネーション",
        render: () => <ServerPaginationDemo />,
      },
    ],
  },
  { slug: "effects", label: "✨ 演出", children: effectDemos },
]

/** デモの一覧 (小タブまで平らにしたもの)。 */
export const demos: Demo[] = tabs.flatMap((t) => t.children)

/**
 * #slug から開くデモと上位タブを決める。上位タブの slug (#effects) はその先頭のデモ、
 * 知らない slug は既定 (先頭のタブの先頭) にする。
 */
export function resolveSlug(slug: string): { tab: DemoTab; demo: Demo } {
  for (const tab of tabs) {
    const demo = tab.children.find((d) => d.slug === slug)
    if (demo) return { tab, demo }
  }
  const tab = tabs.find((t) => t.slug === slug) ?? tabs[0]
  return { tab, demo: tab.children[0] }
}
