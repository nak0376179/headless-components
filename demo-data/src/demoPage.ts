// 演出系のデモで包む偽ページ (本物らしいダッシュボード) の中身と見た目。
// React / Vue で同じ物を出すため、データと CSS (クラス名は hcdp- で始める) をここに置く。
// ⚠ ジグソー・ガラス割れはページの DOM を破片の数だけ複製するので、要素を増やしすぎない。
import { sparklinePath } from "./cards"

/** 旧版のカード (互換のため残す)。 */
export const DEMO_PAGE_CARDS = [
  ["売上", "¥1,284,000", "#2d8f5a"],
  ["新規ユーザー", "3,920", "#6a5cff"],
  ["解約率", "1.8%", "#e8543f"],
  ["平均滞在", "4m 12s", "#0a9396"],
  ["問い合わせ", "57件", "#ca6702"],
  ["稼働率", "99.97%", "#005f73"],
] as const

export const DASH_NAV = ["ダッシュボード", "注文", "顧客", "商品", "レポート", "設定"]

export const DASH_KPIS = [
  {
    icon: "💴",
    label: "今月の売上",
    value: "¥12.84M",
    delta: "+12.4%",
    up: true,
    color: "#2d8f5a",
    series: [8, 9, 7, 10, 12, 11, 14],
  },
  {
    icon: "🧑‍🤝‍🧑",
    label: "アクティブユーザー",
    value: "39,204",
    delta: "+5.1%",
    up: true,
    color: "#6a5cff",
    series: [5, 6, 6, 7, 6, 8, 9],
  },
  {
    icon: "🛒",
    label: "注文数",
    value: "8,421",
    delta: "+2.3%",
    up: true,
    color: "#0a9396",
    series: [6, 7, 7, 6, 8, 8, 9],
  },
  {
    icon: "↩️",
    label: "解約率",
    value: "1.8%",
    delta: "-0.6pt",
    up: false,
    color: "#e8543f",
    series: [4, 3.6, 3.2, 3, 2.6, 2.2, 1.8],
  },
].map((k) => ({ ...k, spark: sparklinePath(k.series, 120, 32) }))

/** 月別売上 (百万円)。棒グラフにする。 */
export const DASH_MONTHS = [
  ["1月", 6.2],
  ["2月", 7.1],
  ["3月", 8.4],
  ["4月", 7.9],
  ["5月", 9.2],
  ["6月", 10.1],
  ["7月", 9.6],
  ["8月", 11.3],
  ["9月", 12.8],
  ["10月", 11.9],
  ["11月", 13.4],
  ["12月", 15.2],
] as const
export const DASH_MONTH_MAX = Math.max(...DASH_MONTHS.map(([, v]) => v))

/** 流入元 (割合 %)。ドーナツグラフにする。 */
export const DASH_SOURCES = [
  { label: "検索", value: 46, color: "#6a5cff" },
  { label: "SNS", value: 24, color: "#00c2ff" },
  { label: "広告", value: 18, color: "#ee9b00" },
  { label: "直接", value: 12, color: "#2d8f5a" },
]
/** ドーナツの円周 (r=40) と、各区間の dasharray / dashoffset。 */
const C = 2 * Math.PI * 40
export const DASH_DONUT = DASH_SOURCES.reduce<{
  acc: number
  parts: { color: string; dash: string; offset: number }[]
}>(
  (s, x) => {
    const len = (x.value / 100) * C
    s.parts.push({ color: x.color, dash: `${len} ${C - len}`, offset: -s.acc })
    s.acc += len
    return s
  },
  { acc: 0, parts: [] },
).parts

export const DASH_ORDERS = [
  {
    id: "#10428",
    customer: "株式会社みなと",
    item: "年間プラン ×12",
    amount: "¥184,800",
    status: "支払済",
    color: "#2d8f5a",
  },
  {
    id: "#10427",
    customer: "青葉デザイン",
    item: "プロ ×3",
    amount: "¥10,800",
    status: "処理中",
    color: "#ee9b00",
  },
  {
    id: "#10426",
    customer: "北斗物流",
    item: "エンタープライズ",
    amount: "¥1,200,000",
    status: "支払済",
    color: "#2d8f5a",
  },
  {
    id: "#10425",
    customer: "さくら書房",
    item: "プロ ×1",
    amount: "¥3,600",
    status: "返金",
    color: "#e8543f",
  },
  {
    id: "#10424",
    customer: "Nova Labs",
    item: "年間プラン ×4",
    amount: "¥61,600",
    status: "支払済",
    color: "#2d8f5a",
  },
]

export const DASH_ACTIVITY = [
  {
    who: "佐藤",
    what: "新しいレポート「Q3 売上」を共有しました",
    when: "2 分前",
    color: "#6a5cff",
  },
  { who: "鈴木", what: "注文 #10427 の請求書を発行しました", when: "18 分前", color: "#0a9396" },
  { who: "高橋", what: "顧客「Nova Labs」を追加しました", when: "1 時間前", color: "#ee9b00" },
  { who: "田中", what: "商品「プロ」の価格を改定しました", when: "3 時間前", color: "#e8543f" },
]

/** 偽ページの見た目 (クラス名は hcdp- で始まる。テーマに依らず固定の配色)。 */
export const DEMO_PAGE_CSS = `
.hcdp { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1c2033; background: #f4f6fb; font-size: 14px; }
.hcdp * { box-sizing: border-box; }
.hcdp-top { display: flex; align-items: center; gap: 16px; padding: 12px 20px; background: #fff; border-bottom: 1px solid #e6e9f2; }
.hcdp-logo { font-weight: 800; font-size: 17px; white-space: nowrap; }
.hcdp-search { flex: 1; max-width: 360px; padding: 8px 12px; border-radius: 8px; background: #f1f3f9; color: #8a90a6; }
.hcdp-spacer { flex: 1; }
.hcdp-bell { position: relative; font-size: 18px; }
.hcdp-bell b { position: absolute; top: -6px; right: -8px; background: #e8543f; color: #fff; border-radius: 99px; font-size: 10px; padding: 1px 5px; }
.hcdp-avatar { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 700; background: linear-gradient(135deg,#6a5cff,#00c2ff); }
.hcdp-body { display: flex; }
.hcdp-side { width: 190px; flex: none; padding: 16px 12px; background: #fff; border-right: 1px solid #e6e9f2; }
.hcdp-side a { display: block; padding: 9px 12px; border-radius: 8px; color: #4a5068; text-decoration: none; margin-bottom: 2px; }
.hcdp-side a.on { background: #eef0ff; color: #4b3ff0; font-weight: 700; }
.hcdp-main { flex: 1; min-width: 0; padding: 20px; display: grid; gap: 16px; }
.hcdp-hero { border-radius: 14px; padding: 22px 24px; color: #fff; background: linear-gradient(120deg,#6a5cff,#00c2ff); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.hcdp-hero h1 { margin: 0; font-size: 24px; }
.hcdp-hero p { margin: 4px 0 0; opacity: 0.9; }
.hcdp-hero button { border: 0; border-radius: 99px; padding: 9px 16px; font-weight: 700; cursor: pointer; background: #fff; color: #4b3ff0; }
.hcdp-hero button.ghost { background: rgba(255,255,255,0.2); color: #fff; }
.hcdp-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; }
.hcdp-card { background: #fff; border-radius: 14px; padding: 16px 18px; box-shadow: 0 1px 4px rgba(20,30,60,0.08); }
.hcdp-kpi-head { display: flex; align-items: center; gap: 8px; color: #6b7189; font-size: 13px; }
.hcdp-kpi-icon { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; font-size: 16px; }
.hcdp-kpi-value { font-size: 24px; font-weight: 800; margin-top: 8px; }
.hcdp-delta { font-size: 12px; font-weight: 700; }
.hcdp-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
@media (max-width: 900px) { .hcdp-row { grid-template-columns: 1fr; } .hcdp-side { display: none; } }
.hcdp-title { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.hcdp-title h2 { margin: 0; font-size: 15px; }
.hcdp-title span { color: #8a90a6; font-size: 12px; }
.hcdp-bars { display: flex; align-items: flex-end; gap: 8px; height: 180px; padding-top: 8px; }
.hcdp-bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; font-size: 11px; color: #8a90a6; }
.hcdp-bar i { display: block; width: 100%; border-radius: 6px 6px 2px 2px; background: linear-gradient(180deg,#a59cff,#6a5cff); }
.hcdp-bar.max i { background: linear-gradient(180deg,#5fe0ff,#00a3d9); }
.hcdp-donut { display: flex; align-items: center; gap: 16px; }
.hcdp-legend { display: grid; gap: 8px; font-size: 13px; }
.hcdp-legend span { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; }
.hcdp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.hcdp-table th { text-align: left; color: #8a90a6; font-weight: 600; padding: 8px 6px; border-bottom: 1px solid #eef0f5; }
.hcdp-table td { padding: 10px 6px; border-bottom: 1px solid #f2f4f8; }
.hcdp-pill { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 12px; font-weight: 700; }
.hcdp-act { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f2f4f8; }
.hcdp-act:last-child { border-bottom: 0; }
.hcdp-dot { width: 30px; height: 30px; flex: none; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 12px; font-weight: 700; }
.hcdp-act small { color: #8a90a6; }
.hcdp-foot { padding: 16px 24px; background: #22223b; color: #cfcfe0; font-size: 13px; }
`
