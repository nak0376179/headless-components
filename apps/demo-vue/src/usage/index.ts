// ページ下部の「コードの使い方」。コード例は同じフォルダの実ファイルを ?raw で読む
// (型検査を通るファイルなので、API とずれたら pnpm check で気づける)。
import type { UsageBlock } from "@hc/demo-data"
import csvColumns from "./csv-json/columns.ts?raw"
import csvComponent from "./csv-json/Component.vue?raw"
import csvControl from "./csv-json/Control.vue?raw"
import csvHeadless from "./csv-json/Headless.vue?raw"
import csvCoreOnly from "./csv-json/core-only.ts?raw"
import dtColumns from "./datatable/columns.ts?raw"
import dtComponent from "./datatable/Component.vue?raw"
import dtHeadless from "./datatable/Headless.vue?raw"
import spComponent from "./server-pagination/Component.vue?raw"
import spMemory from "./server-pagination/memory.ts?raw"
import fxJigsaw from "./effects/Jigsaw.vue?raw"
import fxShatter from "./effects/Shatter.vue?raw"
import fxCheat from "./effects/CheatCode.vue?raw"
import fxPixelate from "./effects/Pixelate.vue?raw"

/** アプリへの取り込み (どのページにも出す)。 */
export const VENDOR_BLOCK: UsageBlock = {
  title: "アプリへ取り込む",
  note: "npm には出していないので、使うアプリへソースごとコピーする。取り込んだ後は import の `@hc/vuetify` を `@/libs/ui-kit/vuetify` (`@hc/core` は `@/libs/ui-kit/core`) に読み替える。",
  lang: "sh",
  code: [
    "# このリポジトリで実行する (取り込み先: <アプリ>/src/libs/ui-kit/)",
    "pnpm vendor ../my-app --ui vuetify",
    "",
    "# 足りない依存 (papaparse・@tanstack/table-core など) が表示されたらアプリに入れる",
    "# 取り込んだ中身は編集しない。直すならこのリポジトリを直して取り込み直す",
    "pnpm vendor ../my-app --check",
  ].join("\n"),
}

export const usageBySlug: Record<string, UsageBlock[]> = {
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
      lang: "vue",
      file: "ImportPage.vue",
      code: csvComponent,
    },
    {
      title: "3. 外から流し込んで変換する",
      note: "ref で受け取った setText / convert で、ファイルの中身やサンプルを入れてそのまま変換できる (このページのサンプルボタンもこれ)。",
      lang: "vue",
      file: "ImportFromFile.vue",
      code: csvControl,
    },
    {
      title: "4. 見た目を自前で作る",
      note: "状態と操作は useCsvJson (composable) が持つ。見出しの文言 (csvJsonErrorHeading など) もコアの関数なので、自作の UI でも同じ言い回しになる。",
      lang: "vue",
      file: "MyImporter.vue",
      code: csvHeadless,
    },
    {
      title: "5. UI なしで変換だけする",
      note: "convertDelimitedText は Vue も DOM も使わない。区切り (カンマ / タブ) は自動で判定する。",
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
      lang: "vue",
      file: "Employees.vue",
      code: dtComponent,
    },
    {
      title: "3. 見た目を自前で作る",
      lang: "vue",
      file: "MyTable.vue",
      code: dtHeadless,
    },
  ],
  "server-pagination": [
    {
      title: "1. サーバーから 1 ページずつ取る",
      note: "fetchPage は { limit, cursor, search } を受けて { items, nextCursor } を返す関数。投げたエラーは画面に出る。",
      lang: "vue",
      file: "ServerEmployees.vue",
      code: spComponent,
    },
    {
      title: "2. API が無いうちは模擬 API で",
      lang: "ts",
      file: "source.ts",
      code: spMemory,
    },
  ],
  jigsaw: [{ title: "ページを包む", lang: "vue", file: "April1st.vue", code: fxJigsaw }],
  shatter: [{ title: "ページを包む", lang: "vue", file: "Fragile.vue", code: fxShatter }],
  "cheat-code": [{ title: "ページを包む", lang: "vue", file: "EasterEgg.vue", code: fxCheat }],
  pixelate: [{ title: "ページを包む", lang: "vue", file: "Spoiler.vue", code: fxPixelate }],
}
