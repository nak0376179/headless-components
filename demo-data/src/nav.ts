// デモの画面一覧 (上位タブ → 小タブ)。React 版と Nuxt 版で共用する。
// ページは react/src/pages/<tab>/<page>.tsx と nuxt/src/pages/<tab>/<page>.vue に置き、URL は /<tab>/<page>。
// 同じパスを開けば両方で同じデモが開く (nav.test.ts が両方にファイルがあるかを確かめる)。

export interface NavPage {
  slug: string
  label: string
}

export interface NavTab {
  slug: string
  label: string
  /** 2 つ以上あるときだけ小タブを出す。先頭がそのタブの既定。 */
  pages: NavPage[]
}

/** 上位タブの一覧。先頭のタブの先頭が既定のページ。 */
export const NAV: NavTab[] = [
  {
    slug: "form",
    label: "📝 フォーム",
    pages: [
      { slug: "textbox", label: "📝 テキストボックス" },
      { slug: "select", label: "🔽 セレクト" },
      { slug: "checkbox", label: "☑️ チェックボックス" },
      { slug: "radio", label: "🔘 ラジオボタン" },
      { slug: "autocomplete", label: "🔎 AutoComplete" },
    ],
  },
  { slug: "cards", label: "🃏 カード", pages: [{ slug: "card", label: "🃏 カード" }] },
  { slug: "dialogs", label: "💬 ダイアログ", pages: [{ slug: "dialog", label: "💬 ダイアログ" }] },
  {
    slug: "table",
    label: "📊 テーブル",
    pages: [
      { slug: "table-basics", label: "🧮 テーブルの基本" },
      { slug: "datatable", label: "📊 データテーブル" },
      { slug: "server-pagination", label: "🗄️ サーバページネーション" },
      { slug: "infinite", label: "♾️ 無限スクロール" },
    ],
  },
  {
    slug: "effects",
    label: "✨ 演出",
    pages: [
      { slug: "jigsaw", label: "🧩 ジグソー" },
      { slug: "shatter", label: "💥 ガラス割れ" },
      { slug: "cheat-code", label: "🎮 隠しコマンド" },
      { slug: "pixelate", label: "🟦 モザイク" },
      { slug: "snow", label: "❄️ 雪" },
    ],
  },
]

/** 名前を変えたページの古い slug (ブックマークを生かす)。 */
const ALIASES: Record<string, string> = { "csv-json": "textbox" }

export const navPath = (tab: NavTab, page: NavPage) => `/${tab.slug}/${page.slug}`

export interface NavMatch {
  tab: NavTab
  page: NavPage
  /** 正規の URL パス (/<tab>/<page>)。 */
  path: string
}

/**
 * URL パス (または旧版の #slug) から開くページを決める。
 * - `/table/infinite` → そのページ
 * - `/table` (タブだけ) → そのタブの先頭
 * - `infinite` / `#infinite` (旧版のハッシュ) → そのページ
 * - 知らないもの・`/` → 既定 (先頭のタブの先頭)
 */
export function resolveNav(pathOrSlug: string): NavMatch {
  const parts = pathOrSlug.replace(/^#/, "").split("/").filter(Boolean)
  const match = (tab: NavTab, page = tab.pages[0]) => ({ tab, page, path: navPath(tab, page) })
  const [first, second] = parts.map((p) => ALIASES[p] ?? p)
  const tab = NAV.find((t) => t.slug === first)
  if (tab) return match(tab, tab.pages.find((p) => p.slug === second) ?? tab.pages[0])
  // 旧版の #slug はページ名だけだった
  for (const t of NAV) {
    const page = t.pages.find((p) => p.slug === first)
    if (page) return match(t, page)
  }
  return match(NAV[0])
}
