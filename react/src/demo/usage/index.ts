// ページ下部の「コードの使い方」。コード例は同じフォルダの実ファイルを ?raw で読む
// (型検査を通るファイルなので、API とずれたら pnpm check で気づける)。
import type { UsageBlock } from "@demo-data"
import dialogBasic from "./dialog/basic.tsx?raw"
import dialogDemo from "@/pages/dialogs/dialog.tsx?raw"
import cardDemo from "@/pages/cards/card.tsx?raw"
import infComponent from "./infinite/component.tsx?raw"
import infHeadless from "./infinite/headless.tsx?raw"
import tableBasicsDemo from "@/pages/table/table-basics.tsx?raw"
import fxSnow from "./effects/snow.tsx?raw"
import formBasic from "./form/basic.tsx?raw"
import formRules from "./form/rules.ts?raw"
import selectDemo from "@/pages/form/select.tsx?raw"
import checkboxDemo from "@/pages/form/checkbox.tsx?raw"
import radioDemo from "@/pages/form/radio.tsx?raw"
import autocompleteDemo from "@/pages/form/autocomplete.tsx?raw"
import formShell from "@/demo/FormShell.tsx?raw"
import csvColumns from "./csv-json/columns.ts?raw"
import csvComponent from "./csv-json/component.tsx?raw"
import csvControl from "./csv-json/control.tsx?raw"
import csvHeadless from "./csv-json/headless.tsx?raw"
import csvCoreOnly from "./csv-json/core-only.ts?raw"
import dtColumns from "./datatable/columns.ts?raw"
import dtComponent from "./datatable/component.tsx?raw"
import dtHeadless from "./datatable/headless.tsx?raw"
import spComponent from "./server-pagination/component.tsx?raw"
import spMemory from "./server-pagination/memory.ts?raw"
import fxJigsaw from "./effects/jigsaw.tsx?raw"
import fxShatter from "./effects/shatter.tsx?raw"
import fxCheat from "./effects/cheat-code.tsx?raw"
import fxPixelate from "./effects/pixelate.tsx?raw"

/** アプリへの取り込み (どのページにも出す)。 */
export const VENDOR_BLOCK: UsageBlock = {
  title: "アプリへ取り込む",
  note: "npm には出していないので、使うアプリへソースごとコピーする。このリポジトリと同じ場所 (src/core・src/components・src/hooks) に入るので、上のコード例の import はそのまま使える。アプリには別名 `@core` → src/core を張る (足りない設定は表示される)。",
  lang: "sh",
  code: [
    "# このリポジトリで実行する",
    "pnpm vendor ../my-app --ui react",
    "",
    "# 足りない依存 (papaparse・@tanstack/table-core・@tanstack/react-query など) と別名の設定が表示されたら足す",
    "# 取り込んだファイルは編集しない。直すならこのリポジトリを直して取り込み直す",
    "pnpm vendor ../my-app --check",
  ].join("\n"),
}

const FORM_BASIC: UsageBlock = {
  title: "フォームの基本",
  note: "useForm が値・検査・触れたか・送信中を持つ。部品には値と変更・blur・エラーを渡すだけなので、セレクトやチェックボックスでも同じ書き方になる。",
  lang: "tsx",
  file: "SignupForm.tsx",
  code: formBasic,
}
const FORM_RULES: UsageBlock = {
  title: "検査の書き方",
  note: "検査は「理由か null を返す関数」。配列で並べると順に当てる。他の項目を見たいときは 2 つ目の引数を使う。",
  lang: "ts",
  file: "rules.ts",
  code: formRules,
}
const pageSource = (title: string, file: string, code: string): UsageBlock => ({
  title,
  note: "このページのソースそのもの (送信ボタンと値の表示は下の FormShell)。",
  lang: "tsx",
  file,
  code,
})
const FORM_SHELL: UsageBlock = {
  title: "共通の枠 (送信・リセット・値の表示)",
  lang: "tsx",
  file: "FormShell.tsx",
  code: formShell,
}
const csvTitle = (b: UsageBlock): UsageBlock => ({ ...b, title: `CSV / TSV ${b.title}` })

export const usageBySlug: Record<string, UsageBlock[]> = {
  infinite: [
    {
      title: "1. 完成品のテーブルで使う",
      note: "fetchPage はサーバーページネーションと同じ形。行の高さを一定にし、列幅は meta.width で固定する。",
      lang: "tsx",
      file: "AllEmployees.tsx",
      code: infComponent,
    },
    {
      title: "2. 自前のリストに付ける",
      note: "読み込みは useInfiniteList、描く範囲は virtualWindow (見えている行 ± 8 行と、上下の詰め物の高さを返す)。表でなくても使える。",
      lang: "tsx",
      file: "MessageList.tsx",
      code: infHeadless,
    },
  ],
  "table-basics": [
    {
      title: "このページのソース",
      note: "選択は enableRowSelection、展開は getRowCanExpand を渡すだけ。状態 (rowSelection / expanded) は useDataTable が持つ。まとめて削除は createDialogs で確かめる。",
      lang: "tsx",
      file: "TableBasicsDemo.tsx",
      code: tableBasicsDemo,
    },
  ],
  dialog: [
    {
      title: "1. 置き方と開き方",
      note: "createDialogs をアプリで 1 つ作り、一番外側に DialogHost を 1 か所置く。使う所では await するだけ。",
      lang: "tsx",
      file: "dialogs.tsx",
      code: dialogBasic,
    },
    {
      title: "2. このページのソース",
      note: "中身を自由に作るダイアログ (フォーム入り) は、UI ライブラリのダイアログに useForm を組み合わせる。",
      lang: "tsx",
      file: "DialogDemo.tsx",
      code: dialogDemo,
    },
  ],
  card: [
    {
      title: "このページのソース",
      note: "カードは見た目の型なので、ヘッドレスの部品は使っていない (状態は各カードの中で持つ)。題材のデータは @demo-data。",
      lang: "tsx",
      file: "CardDemo.tsx",
      code: cardDemo,
    },
  ],
  select: [pageSource("連動するセレクトと複数選択", "SelectDemo.tsx", selectDemo), FORM_SHELL],
  checkbox: [
    pageSource("チェックした物をリストで持つ", "CheckboxDemo.tsx", checkboxDemo),
    FORM_SHELL,
  ],
  radio: [pageSource("選んだ組み合わせをリストに保存", "RadioDemo.tsx", radioDemo), FORM_SHELL],
  autocomplete: [
    pageSource("読みでも探せる AutoComplete", "AutocompleteDemo.tsx", autocompleteDemo),
    FORM_SHELL,
  ],
  "csv-json": [
    {
      title: "1. 列を定義する",
      note: "ヘッダの日本語名 (label) と JSON のキー (key)、必須 / 省略可 / 不要、文字数、検査を並べる。検査は組み合わせられる (combine)。UI に依らないので React / Vue で同じ物を使う。",
      lang: "ts",
      file: "columns.ts",
      code: csvColumns,
    },
    {
      title: "2. 完成品のコンポーネントで使う",
      note: "貼り付け欄・出力形式 (JSON / CSV / TSV) の切り替え・変換・エラー一覧・コピーまで入っている。結果は onConvert で受け取る。",
      lang: "tsx",
      file: "ImportPage.tsx",
      code: csvComponent,
    },
    {
      title: "3. 外から流し込んで変換する",
      note: "ref の setText / convert で、ファイルの中身やサンプルを入れてそのまま変換できる (このページのサンプルボタンもこれ)。",
      lang: "tsx",
      file: "ImportFromFile.tsx",
      code: csvControl,
    },
    {
      title: "4. 見た目を自前で作る",
      note: "状態と操作は useCsvJson が持つ。見出しの文言 (csvJsonErrorHeading など) もコアの関数なので、自作の UI でも同じ言い回しになる。",
      lang: "tsx",
      file: "MyImporter.tsx",
      code: csvHeadless,
    },
    {
      title: "5. UI なしで変換だけする",
      note: "convertDelimitedText は React も DOM も使わない。区切り (カンマ / タブ) は自動で判定する。",
      lang: "ts",
      file: "convert.ts",
      code: csvCoreOnly,
    },
  ],
  datatable: [
    {
      title: "1. 列を定義する",
      note: "TanStack Table の列定義そのもの。meta.searchText を書くと、フリーワード検索が画面の文字 (「在籍」「¥5,200,000」) でも当たる。",
      lang: "ts",
      file: "columns.ts",
      code: dtColumns,
    },
    {
      title: "2. 完成品のコンポーネントで使う",
      note: "並べ替え・フリーワード検索・ページングは手元で行う。",
      lang: "tsx",
      file: "Employees.tsx",
      code: dtComponent,
    },
    {
      title: "3. 見た目を自前で作る",
      lang: "tsx",
      file: "MyTable.tsx",
      code: dtHeadless,
    },
  ],
  "server-pagination": [
    {
      title: "1. サーバーから 1 ページずつ取る",
      note: "fetchPage は { limit, cursor, search } を受けて { items, nextCursor } を返す関数。投げたエラーは画面に出る。",
      lang: "tsx",
      file: "ServerEmployees.tsx",
      code: spComponent,
    },
    {
      title: "2. API が無いうちは模擬 API で",
      lang: "ts",
      file: "source.ts",
      code: spMemory,
    },
  ],
  jigsaw: [{ title: "ページを包む", lang: "tsx", file: "April1st.tsx", code: fxJigsaw }],
  shatter: [{ title: "ページを包む", lang: "tsx", file: "Fragile.tsx", code: fxShatter }],
  "cheat-code": [{ title: "ページを包む", lang: "tsx", file: "EasterEgg.tsx", code: fxCheat }],
  snow: [
    {
      title: "ページを包む",
      note: "積もらせたい要素に data-snow-target を付ける。要素が動いても雪は一緒に動く。shake で払い落とし、melt で溶かす。",
      lang: "tsx",
      file: "WinterLogin.tsx",
      code: fxSnow,
    },
  ],
  pixelate: [{ title: "ページを包む", lang: "tsx", file: "Spoiler.tsx", code: fxPixelate }],
}

// テキストボックスのページ = フォームの基本 + CSV / TSV の一括入力
usageBySlug.textbox = [FORM_BASIC, FORM_RULES, ...usageBySlug["csv-json"].map(csvTitle)]
