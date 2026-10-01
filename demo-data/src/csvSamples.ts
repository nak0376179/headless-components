import type { ColumnSpec, ColumnUsage } from "@core"
import { email, numeric } from "@core"

/** デモ用の列定義。よく使うバリデータのビルダー（email / numeric）で組み立てている。 */
export const demoColumns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required", maxLength: 20 },
  { label: "メールアドレス", key: "email", usage: "required", maxLength: 100, validate: email() },
  { label: "年齢", key: "age", usage: "optional", validate: numeric() },
  // 部署は文字種を問わない（全角・半角どちらでも可）。長さだけ 10 文字以内に制限する。
  { label: "部署", key: "department", usage: "optional", maxLength: 10 },
  { label: "メモ", key: "memo", usage: "unused" },
]

export const usageLabel: Record<ColumnUsage, string> = {
  required: "必須",
  optional: "省略可",
  unused: "不要",
}

/** デモ画面で「読み込んで変換」できるサンプル入力。 */
export interface DemoSample {
  /** ボタンに出す短いラベル。 */
  label: string
  /** そのサンプルが何を示すかの説明（画面に表示する）。 */
  description: string
  /** テキストエリアに流し込む CSV / TSV。 */
  text: string
}

export const demoSamples: DemoSample[] = [
  {
    label: "基本（CSV）",
    description: "そのまま変換できる正常な CSV。不要列「メモ」は出力から消える。",
    text: [
      "氏名,メールアドレス,年齢,部署,メモ",
      "山田太郎,taro@example.com,30,開発部,自由記入",
      "佐藤花子,hanako@example.com,,営業部,",
    ].join("\n"),
  },
  {
    label: "前後の空白（trim）",
    description:
      "ヘッダ・各セルの前後の空白（半角スペース・タブ・全角スペース）は自動で取り除く。値の途中の空白は保持する（例: 「山 田」）。",
    text: [
      "　氏名　, メールアドレス , 年齢 ",
      "　山 田　, taro@example.com , 30 ",
      " 佐藤花子 ,　hanako@example.com　, 25 ",
    ].join("\n"),
  },
  {
    label: "列を入れ替え",
    description:
      "入力の列順がバラバラでも、出力キーは列定義の順（氏名 → メール → 年齢 → 部署）に揃う。",
    text: [
      "年齢,部署,氏名,メモ,メールアドレス",
      "30,開発部,山田太郎,自由記入,taro@example.com",
      ",営業部,佐藤花子,,hanako@example.com",
    ].join("\n"),
  },
  {
    label: "TSV（Excel からコピペ）",
    description: "タブ区切りも自動判別する。Excel やスプレッドシートからの貼り付けを想定。",
    text: [
      "氏名\tメールアドレス\t年齢\t部署\tメモ",
      "山田太郎\ttaro@example.com\t30\t開発部\t自由記入",
      "佐藤花子\thanako@example.com\t\t営業部\t",
    ].join("\n"),
  },
  {
    label: "エラー例（データ行）",
    description:
      "必須もれ・メール形式・年齢の数値・氏名の文字数（20文字超）を行番号つきでまとめて検出する。",
    text: [
      "氏名,メールアドレス,年齢,部署,メモ",
      ",taro@example.com,30,開発部,",
      "佐藤花子,not-an-email,25,営業部,",
      "鈴木一郎,ichiro@example.com,さんじゅう,総務部,",
      "とても長い氏名なので二十文字の上限を超えてしまいます,x@example.com,40,人事部,",
    ].join("\n"),
  },
  {
    label: "エラー例（ヘッダ）",
    description:
      "未定義の項目名「メール」と、必須項目「メールアドレス」の欠落をヘッダ段階で検出する。",
    text: ["氏名,メール,年齢", "山田太郎,taro@example.com,30"].join("\n"),
  },
  {
    label: "エラー多数（上限10件）",
    description:
      "12 行すべてメール形式エラー。エラーは上限の 10 件で打ち切られ、見出しは「10件以上」・11 件目以降は表示されない。",
    text: [
      "氏名,メールアドレス,年齢,部署,メモ",
      ...Array.from({ length: 12 }, (_, i) => `社員${i + 1},not-an-email,30,開発部,`),
    ].join("\n"),
  },
]
