// CSV/TSV のデモで見せる「機能と使い方」「仕様」「テスト結果」。React 版と Nuxt 版で共用する。
// 中身は utils/src/csv-json の README.md・SPEC.md (別チームへ渡すものと同じ) と、
// pnpm csv:report が書いた generated/csv-report.json。デモ用に別の文章は持たない。
import { marked } from "marked"
import readmeMd from "../../utils/src/csv-json/README.md?raw"
import specMd from "../../utils/src/csv-json/SPEC.md?raw"
import report from "./generated/csv-report.json"

export type CsvReport = typeof report
export const CSV_REPORT: CsvReport = report

// 文書の中のリンク (README.md ↔ SPEC.md) を、デモのページへ向ける
const linkToPages = (md: string) =>
  md
    .replace(/\]\(SPEC\.md(#[^)]*)?\)/g, "](/csv-json/spec)")
    .replace(/\]\(README\.md(#[^)]*)?\)/g, "](/csv-json/readme)")

/** README.md (機能と使い方) を HTML にしたもの。 */
export const CSV_README_HTML = marked.parse(linkToPages(readmeMd), { async: false })
/** SPEC.md (詳しい仕様) を HTML にしたもの。 */
export const CSV_SPEC_HTML = marked.parse(linkToPages(specMd), { async: false })

/** テストのファイルごとの見出し (何を確かめているか)。 */
export const CSV_TEST_FILE_LABELS: Record<string, string> = {
  "csv-json/readme.test.ts": "README の「できること」の例",
  "csv-json/japanese.test.ts": "日本語の入力 (Excel のコピペ・全角/半角・BOM…)",
  "csv-json/convert.test.ts": "仕様 (SPEC.md) の挙動",
  "csv-json/validators.test.ts": "用意している検査 (email・numeric…)",
  "csv-json/controller.test.ts": "入力画面の状態 (createCsvJson)",
  "store.test.ts": "小さなストア (createStore)",
}

/** テストのファイルを読む順 (上の見出しの順。見出しの無いものは最後) に並べたもの。 */
export const CSV_TEST_FILES = [...report.files].sort((a, b) => {
  const order = Object.keys(CSV_TEST_FILE_LABELS)
  const at = (f: string) => (order.includes(f) ? order.indexOf(f) : order.length)
  return at(a.file) - at(b.file)
})

export const COVERAGE_METRICS = [
  { key: "statements", label: "文" },
  { key: "branches", label: "分岐" },
  { key: "functions", label: "関数" },
  { key: "lines", label: "行" },
] as const

/** ファイルの中のテストを describe ごとにまとめる。 */
export function groupTests(tests: CsvReport["files"][number]["tests"]) {
  const groups = new Map<string, typeof tests>()
  for (const t of tests) groups.set(t.group, [...(groups.get(t.group) ?? []), t])
  return [...groups].map(([title, items]) => ({ title, items }))
}

/** 生成日時を「2026-10-02 10:15」の形に。 */
export const formatReportTime = (iso: string) => {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Markdown を HTML にした文書の見た目 (React 版・Nuxt 版で共通。明暗どちらのテーマでも読める色)。 */
export const MARKDOWN_CSS = `
.hc-md { line-height: 1.75; font-size: 15px; max-width: 980px; }
.hc-md h1 { font-size: 1.6em; margin: 0 0 .8em; }
.hc-md h2 { font-size: 1.3em; margin: 1.8em 0 .6em; padding-bottom: .3em; border-bottom: 1px solid rgba(127,127,127,.3); }
.hc-md h3 { font-size: 1.1em; margin: 1.4em 0 .5em; }
.hc-md h4 { font-size: 1em; margin: 1.2em 0 .4em; }
.hc-md p, .hc-md ul, .hc-md ol { margin: .6em 0; }
.hc-md ul, .hc-md ol { padding-left: 1.6em; }
.hc-md code { font-family: ui-monospace, Consolas, monospace; font-size: .9em; background: rgba(127,127,127,.15); padding: .1em .35em; border-radius: 4px; }
.hc-md pre { background: rgba(127,127,127,.12); padding: 12px 14px; border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 1.6; }
.hc-md pre code { background: none; padding: 0; font-size: inherit; }
.hc-md table { border-collapse: collapse; margin: .8em 0; display: block; overflow-x: auto; }
.hc-md th, .hc-md td { border: 1px solid rgba(127,127,127,.35); padding: 6px 10px; text-align: left; vertical-align: top; }
.hc-md th { background: rgba(127,127,127,.12); }
.hc-md blockquote { margin: .8em 0; padding: .2em 1em; border-left: 4px solid rgba(127,127,127,.4); opacity: .85; }
.hc-md a { color: inherit; text-decoration: underline; }
`
