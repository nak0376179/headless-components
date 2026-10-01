// カードのデモの題材 (React / Vue で同じ中身を出す)。

export const PROFILE = {
  name: "佐藤 美咲",
  role: "プロダクトデザイナー",
  initials: "佐",
  color: "#6a5cff",
  bio: "使いやすさと見た目の両立が好き。休日はフィルムカメラで街を撮っています。",
  stats: [
    { label: "投稿", value: "128" },
    { label: "フォロワー", value: "2.4k" },
    { label: "フォロー中", value: "312" },
  ],
}

export const KPIS = [
  {
    label: "今月の売上",
    value: "¥1,284,000",
    delta: 12.4,
    color: "#2d8f5a",
    series: [8, 9, 7, 10, 12, 11, 14],
  },
  {
    label: "新規ユーザー",
    value: "3,920",
    delta: 5.1,
    color: "#6a5cff",
    series: [5, 6, 6, 7, 6, 8, 9],
  },
  {
    label: "解約率",
    value: "1.8%",
    delta: -0.6,
    color: "#e8543f",
    series: [4, 3.6, 3.2, 3, 2.6, 2.2, 1.8],
  },
]

/** ミニグラフ (sparkline) の SVG パス。幅 w・高さ h に収める。 */
export function sparklinePath(series: readonly number[], w = 120, h = 36): string {
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = max - min || 1
  return series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 4) - 2
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

export const PRODUCT = {
  name: "ハンドドリップ コーヒーセット",
  price: 4980,
  listPrice: 6200,
  rating: 4.6,
  reviews: 213,
  emoji: "☕",
  gradient: "linear-gradient(135deg,#f6d365,#fda085)",
  badge: "20% OFF",
}

export const ARTICLE = {
  category: "エンジニアリング",
  title: "ヘッドレスなコンポーネントで、React と Vue の両方に同じ振る舞いを届ける",
  date: "2026-09-27",
  readMin: 6,
  emoji: "🧩",
  gradient: "linear-gradient(120deg,#6a5cff,#00c2ff)",
  summary:
    "振る舞いをフレームワーク非依存のコアに寄せ、見た目は MUI と Vuetify の薄い層にする。そうすると…",
  body:
    "状態は ReadableStore (get / subscribe) で公開し、React は useSyncExternalStore、Vue は shallowRef で購読する。" +
    "同じ機能を 2 回書かずに済むだけでなく、テストもコアだけで済む。見た目の層は「状態を描いてメソッドを呼ぶ」ことしかしないので、" +
    "MUI 版と Vuetify 版の差は props の名前程度に収まる。",
  tags: ["React", "Vue", "設計"],
}

export const SETTINGS = [
  { key: "mail", icon: "📧", label: "メール通知", note: "コメントやメンションを受け取る" },
  { key: "push", icon: "🔔", label: "プッシュ通知", note: "スマホに通知する" },
  { key: "weekly", icon: "🗞️", label: "週刊ダイジェスト", note: "毎週月曜にまとめを届ける" },
] as const
