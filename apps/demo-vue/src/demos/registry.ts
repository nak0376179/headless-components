import type { Component } from "vue"
import EmployeesDemo from "./EmployeesDemo.vue"
import CardDemo from "./CardDemo.vue"
import DialogDemo from "./DialogDemo.vue"
import TextboxDemo from "./form/TextboxDemo.vue"
import SelectDemo from "./form/SelectDemo.vue"
import CheckboxDemo from "./form/CheckboxDemo.vue"
import RadioDemo from "./form/RadioDemo.vue"
import AutocompleteDemo from "./form/AutocompleteDemo.vue"
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

/** 上位タブ。`children` があるタブは下に小タブを並べる (演出系はここにまとめる)。 */
export type DemoTab = { slug: string; label: string; children: Demo[] }

/** 上位タブの一覧。先頭が既定 (#slug が無い・知らないとき開く)。React 版と揃える。 */
export const tabs: DemoTab[] = [
  {
    slug: "form",
    label: "📝 フォーム",
    children: [
      { slug: "textbox", label: "📝 テキストボックス", component: TextboxDemo },
      { slug: "select", label: "🔽 セレクト", component: SelectDemo },
      { slug: "checkbox", label: "☑️ チェックボックス", component: CheckboxDemo },
      { slug: "radio", label: "🔘 ラジオボタン", component: RadioDemo },
      { slug: "autocomplete", label: "🔎 AutoComplete", component: AutocompleteDemo },
    ],
  },
  {
    slug: "cards",
    label: "🃏 カード",
    children: [{ slug: "card", label: "🃏 カード", component: CardDemo }],
  },
  {
    slug: "dialogs",
    label: "💬 ダイアログ",
    children: [{ slug: "dialog", label: "💬 ダイアログ", component: DialogDemo }],
  },
  {
    slug: "table",
    label: "📊 テーブル",
    children: [
      { slug: "datatable", label: "📊 データテーブル", component: EmployeesDemo },
      {
        slug: "server-pagination",
        label: "🗄️ サーバページネーション",
        component: ServerPaginationDemo,
      },
    ],
  },
  { slug: "effects", label: "✨ 演出", children: effectDemos },
]

/** 名前を変えたページの古い #slug (ブックマークを生かす)。 */
const ALIASES: Record<string, string> = { "csv-json": "textbox" }

/** デモの一覧 (小タブまで平らにしたもの)。 */
export const demos: Demo[] = tabs.flatMap((t) => t.children)

/**
 * #slug から開くデモと上位タブを決める。上位タブの slug (#effects) はその先頭のデモ、
 * 知らない slug は既定 (先頭のタブの先頭) にする。
 */
export function resolveSlug(slug: string): { tab: DemoTab; demo: Demo } {
  slug = ALIASES[slug] ?? slug
  for (const tab of tabs) {
    const demo = tab.children.find((d) => d.slug === slug)
    if (demo) return { tab, demo }
  }
  const tab = tabs.find((t) => t.slug === slug) ?? tabs[0]
  return { tab, demo: tab.children[0] }
}
