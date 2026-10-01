// ページ下部の「コードの使い方」。コード例は同じフォルダの実ファイルを ?raw で読む
// (型検査を通るファイルなので、API とずれたら pnpm check で気づける)。
import type { UsageBlock } from "@hc/demo-data"
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
  note: "npm には出していないので、使うアプリへソースごとコピーする。取り込んだ後は import の `@hc/mui` を `@/libs/ui-kit/mui` (`@hc/core` は `@/libs/ui-kit/core`) に読み替える。",
  lang: "sh",
  code: [
    "# このリポジトリで実行する (取り込み先: <アプリ>/src/libs/ui-kit/)",
    "pnpm vendor ../my-app --ui mui",
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
  pixelate: [{ title: "ページを包む", lang: "tsx", file: "Spoiler.tsx", code: fxPixelate }],
}
