# headless-components

React からも Vue (Nuxt) からも使える**ヘッドレスなコンポーネントライブラリ**。ロジック（状態・振る舞い）は
フレームワーク非依存の **utils** に集め、見た目は **MUI（React）** と **Vuetify（Nuxt）** で包んで提供する。
**バックエンドは持たない**（サーバー役が要るデモはブラウザ内の模擬 API）。

## main と draft

| 区分      | 機能                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **main**  | ① **CSV/TSV → JSON 変換**（貼り付け・列定義での検証・JSON / CSV / TSV 出力）<br>② **データテーブル**（取得は TanStack Query、TanStack Table でクライアント側のページング・並べ替え・フリーワード検索） |
| **draft** | それ以外の試作: フォーム・ダイアログ・カード・サーバーページネーション・無限スクロール・演出（ジグソー・ガラス割れ…）。仕様は変わりうる                                                                |

draft のコードは各所の `draft/` フォルダ（`utils/src/draft`・`components/draft`・`hooks/draft`・`composables/draft`）にあり、
デモでは「🧪 Draft」の後ろのタブに出る。取り込み（`pnpm vendor`）の既定では入らない。

## 構成

```text
utils/                @/utils  フレームワーク非依存のロジック (React/Vue を import しない。ESLint で禁止)
  src/
    csv-json/                  CSV/TSV → JSON (README.md・SPEC.md・テスト同梱。単体で別チームへ渡せる)
    data-table/                データテーブル (TanStack Table)・fetchAllPages・模擬 API
    draft/                     draft のロジック
react/                React + MUI + react-router (http://localhost:5210)
  src/
    components/               MUI で包んだ部品 (CsvJsonTextArea・DataTable)       ← アプリへ取り込む
    hooks/                    utils を React で使うフック (useCsvJson・useDataTable) ← アプリへ取り込む
    layouts/ pages/ demo/     デモ (pages/<tab>/<page>.tsx が /<tab>/<page> になる)
nuxt/                 Nuxt 4 + Vuetify、SPA (http://localhost:5211)
  src/
    components/               Vuetify で包んだ部品                                 ← アプリへ取り込む
    composables/              utils を Vue で使う composable                       ← アプリへ取り込む
    layouts/ pages/ demo/     デモ (pages/<tab>/<page>.vue。URL は React 版と同じ)
demo-data/            @demo-data  デモ用のデータと画面一覧 (NAV)。両デモで共用
docs/architecture.md  設計の理由
scripts/              vendor.mjs (アプリへの取り込み)・handoff.mjs (CSV/TSV を utils フォルダとして書き出す)
```

アプリでは utils を **`src/utils/`** に置く想定なので、import は `@/utils`。このリポジトリでは utils をコピーせず
1 か所に置き、各アプリの `@/utils` をそこへ向けている（Vite / Nuxt の alias と tsconfig の paths）。

```ts
import { createCsvJson, email, fetchAllPages, type ColumnSpec } from "@/utils"
import { DataTable } from "@/components/DataTable" // Nuxt: import DataTable from "@/components/DataTable.vue"
import { useCsvJson } from "@/hooks/useCsvJson" // Nuxt: "@/composables/useCsvJson"
```

依存の向き: `utils` ← `hooks` / `composables` ← `components`。**振る舞いを直すときは utils を直せば両方に効く。**
main から draft は参照しない（ESLint で止める）。

### utils の形

どの機能も「状態を `ReadableStore`（`get()` / `subscribe()`）で公開するコントローラ」になっている。

```ts
const c = createCsvJson({ columns })
c.subscribe(() => console.log(c.get().result))
c.setText("氏名,年齢\n山田,30")
c.convert()
```

React は `useSyncExternalStore`、Vue は `shallowRef` で購読するだけ（`useStore`）。MUI / Vuetify の部品は、
状態を描いてコントローラのメソッドを呼ぶだけの薄い包み。

## main の使い方

### CSV/TSV → JSON

列定義（項目名・キー・必須/省略可/不要・文字数・検査）を渡すと、貼り付けたテキストを検証して変換する。
詳しくは [utils/src/csv-json/README.md](utils/src/csv-json/README.md)（使い方）と
[SPEC.md](utils/src/csv-json/SPEC.md)（仕様）。部品は `CsvJsonTextArea`（MUI / Vuetify）。

### データテーブル

```tsx
const { data, error, isFetching, refetch } = useQuery({
  queryKey: ["employees"],
  queryFn: () => fetchAllPages(fetchEmployees, 250), // カーソル方式の API を全件にまとめる
})
<DataTable data={data ?? EMPTY} columns={columns} loading={isFetching} error={error?.message} onRetry={refetch} />
```

- 列定義は TanStack Table の `ColumnDef`（`createColumnHelper` は `@/utils` から再公開）。
  `meta.searchText` を書くと、フリーワード検索が画面の文字（「在籍」「¥5,200,000」）でも当たる。
- 検索は空白区切りの AND。全角/半角・大文字/小文字・ひらがな/カタカナの違いは無視する。
- `data` は描画のたびに新しい配列にしない（取得前も同じ空配列を渡す）。

## CSV/TSV だけを別チームへ渡す

CSV/TSV → JSON は、**`utils` フォルダ 1 つ**（README・仕様・テスト同梱、画面の部品なし）として書き出せる。
受け取った側は React / Next.js / Vue / Nuxt を問わず、それを `src/utils/` に置いて `papaparse` を入れるだけで使える。

```bash
pnpm handoff              # handoff/csv-json/utils/ に書き出す
pnpm handoff --zip        # handoff/csv-json-utils-<commit>.zip も作る
pnpm handoff --verify     # 無関係な空のプロジェクトに入れ、papaparse だけで型検査とテストが通るか確かめる
```

## アプリで使う (取り込み)

部品 (MUI / Vuetify) も含めて自分たちのアプリへ入れるときは vendoring でコピーする（npm には出していない）。

```bash
pnpm vendor <アプリのディレクトリ> --ui react    # React + MUI のアプリ (main だけ)
pnpm vendor <アプリのディレクトリ> --ui nuxt     # Nuxt + Vuetify のアプリ (main だけ)
pnpm vendor <アプリのディレクトリ> --ui react --draft   # draft も入れる
pnpm vendor <アプリのディレクトリ> --check       # 取り込んだ後に手で書き換えていないか
```

- 入る場所はこのリポジトリと同じ: `src/utils/`・`src/components/`・`src/hooks/`（Nuxt は `src/composables/`。
  Nuxt 4 の既定どおり `app/` なら `app/` の下）。テストとデモは入らない。
- アプリに `@` → `src` の別名があればそのまま通る（Nuxt は最初からある）。足りない設定と依存パッケージ
  （バージョン付きの `pnpm add ...`）は取り込み時に表示される。データテーブルには `@tanstack/react-query`
  （Nuxt は `@tanstack/vue-query`）も要る。
- **取り込んだファイルは編集しない。** 直すときはこのリポジトリを直して取り込み直す。取り込み記録
  （`src/utils/.vendored.json`）に無い同名のファイル（アプリのコード）があれば上書きせず止まる。

## 出先から見る

デモは nak-portal の管理者ページの「遊ぶ」に置いている (ログインした自分だけが見られる。公開はしていない)。
CSV/TSV のタブで、デモのほかに「機能と使い方」「詳しい仕様」「テスト結果 (カバレッジ)」が見られる。
上げ直すときは nak-portal で `npm run publish-web -- hc-react hc-nuxt` (テストを流してから両方をビルドして上げる)。

## 開発

```bash
pnpm install
pnpm dev:react     # http://localhost:5210
pnpm dev:nuxt      # http://localhost:5211
pnpm test          # 全体の vitest (utils / demo-data / react / nuxt)
pnpm check         # format:check → lint → typecheck → test → build (Nuxt は nuxt generate で静的な SPA)
```

work/github のランチャー (`python tools/launcher.py start headless-components`) からも両方まとめて起動できる。
ポートは 5210 / 5211 固定（Vite 既定の 5173 は使わない）。右上のリンクで、同じページをもう一方の版で開ける。
