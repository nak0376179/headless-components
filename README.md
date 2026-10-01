# headless-components

React からも Vue (Nuxt) からも使える**ヘッドレスなコンポーネントライブラリ**。ロジック（状態・振る舞い）は
フレームワーク非依存の **core** に集め、見た目は **MUI（React）** と **Vuetify（Nuxt）** で包んで提供する。
**バックエンドは持たない**（サーバー役が要るデモはブラウザ内の模擬 API）。

## 構成

```text
core/                 @core   フレームワーク非依存のロジック (React/Vue を import しない。ESLint で禁止)
  src/                        csv-json / data-table / form / dialog / effects / store
react/                React + MUI + react-router (http://localhost:5210)
  src/
    components/               MUI で包んだ部品 (DataTable・CsvJsonTextArea…)  ← アプリへ取り込む
    hooks/                    core を React で使うフック (useCsvJson・useDataTable…) ← アプリへ取り込む
    layouts/ pages/ demo/     デモ (pages/<tab>/<page>.tsx が /<tab>/<page> になる)
nuxt/                 Nuxt 4 + Vuetify、SPA (http://localhost:5211)
  src/
    components/               Vuetify で包んだ部品                                ← アプリへ取り込む
    composables/              core を Vue で使う composable                       ← アプリへ取り込む
    layouts/ pages/ demo/     デモ (pages/<tab>/<page>.vue。URL は React 版と同じ)
demo-data/            @demo-data  デモ用のデータと画面一覧 (NAV)。両デモで共用
docs/                 設計 (architecture.md)・CSV 変換の仕様 (csv-json-spec.md)
scripts/vendor.mjs    アプリへの取り込み
```

**core はコピーせず 1 か所に置き、各アプリから別名 `@core` で参照する**（Vite / Nuxt の alias と tsconfig の paths。
シンボリックリンクは Windows で扱いにくいので使わない）。アプリへ取り込むときは `src/core/` にコピーして
同じ別名を張るので、import 文はこのリポジトリでもアプリでも同じになる。理由は [docs/architecture.md](docs/architecture.md)。

```ts
import { createCsvJson, email, type ColumnSpec } from "@core" // または "@core/csv-json"
import { DataTable } from "@/components/DataTable" // Nuxt: import DataTable from "@/components/DataTable.vue"
import { useCsvJson } from "@/hooks/useCsvJson" // Nuxt: "@/composables/useCsvJson"
```

依存の向き: `core` ← `hooks` / `composables` ← `components`。**振る舞いを直すときは core を直せば両方に効く。**

### core の形

どの機能も「状態を `ReadableStore`（`get()` / `subscribe()`）で公開するコントローラ」になっている。

```ts
const c = createCsvJson({ columns })
c.subscribe(() => console.log(c.get().result))
c.setText("氏名,年齢\n山田,30")
c.convert()
```

- React は `useSyncExternalStore`、Vue は `shallowRef` で購読するだけ（`useStore`）。
- MUI / Vuetify の部品は、状態を描いてコントローラのメソッドを呼ぶだけの薄い包み。
- 演出系（effects）は DOM を直接操作するコントローラで、部品は host 要素を渡して `useMounted` で取り付ける。

## 機能

| 機能                                                      | core (使っているヘッドレスなライブラリ)                                             | 部品              |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------- |
| CSV/TSV → JSON/CSV/TSV 変換・検証、一括入力               | `convertDelimitedText` / `createCsvJson` / バリデータ (papaparse)                   | `CsvJsonTextArea` |
| データテーブル (並べ替え・全体検索・ページング・選択)     | `createDataTable` (@tanstack/table-core)                                            | `DataTable`       |
| カーソル方式のサーバーページネーション                    | `createCursorPager` / `fetchAllPages` / `createMemorySource` (@tanstack/query-core) | `CursorTable`     |
| 無限スクロール (仮想スクロール)                           | `createInfiniteList` / `virtualWindow` (@tanstack/query-core)                       | `InfiniteTable`   |
| フォーム・ダイアログ                                      | `createForm` / `createDialogs`                                                      | `DialogHost`      |
| 演出系 (ジグソー・ガラス割れ・隠しコマンド・モザイク・雪) | `effects/`                                                                          | 各部品            |

- 列定義は TanStack Table の `ColumnDef` をそのまま使う（`createColumnHelper` は `@core` から再公開）。
  `header` / `cell` は値か関数で、関数の戻り値は React なら JSX、Vue なら `h()` の VNode。
- サーバーページネーション・無限スクロールの取得とキャッシュは TanStack Query。アプリの `QueryClient`
  （React は `QueryClientProvider`、Nuxt は `VueQueryPlugin`）があればそれを使うので、`queryKey` を渡せば
  `queryClient.invalidateQueries({ queryKey })` で読み直させられる。無ければ core 内の共有のものを使う。
- CSV 変換の仕様の詳細は [docs/csv-json-spec.md](docs/csv-json-spec.md)。

## アプリで使う (取り込み)

npm には公開していない。アプリへ**ソースごとコピーして使う**（vendoring）。

```bash
cd <このリポジトリ>
pnpm vendor <アプリのディレクトリ> --ui react    # React + MUI のアプリ
pnpm vendor <アプリのディレクトリ> --ui nuxt     # Nuxt + Vuetify のアプリ
pnpm vendor <アプリのディレクトリ> --check       # 取り込んだ後に手で書き換えていないか
```

- 入る場所はこのリポジトリと同じ: `src/core/`、`src/components/`、`src/hooks/`（Nuxt は `src/composables/`。
  Nuxt 4 の既定どおり `app/` なら `app/` の下）。テストとデモは入らない。
- アプリには別名 `@core` → `src/core`（と `@` → `src`。Nuxt は最初からある）を張る。足りない設定と
  依存パッケージ（バージョン付きの `pnpm add ...`）は取り込み時に表示される。
- **取り込んだファイルは編集しない。** 直すときはこのリポジトリを直して取り込み直す（同じコマンドで上書き）。
  アプリ固有の見た目や既定値は別のファイルで包み直す。取り込み記録 (`src/core/.vendored.json`) に無い
  同名のファイル（アプリのコード）があれば上書きせず止まる。

## 開発

```bash
pnpm install
pnpm dev:react     # http://localhost:5210
pnpm dev:nuxt      # http://localhost:5211
pnpm test          # 全体の vitest (core / demo-data / react / nuxt)
pnpm check         # format:check → lint → typecheck → test → build (Nuxt は nuxt generate で静的な SPA)
```

work/github のランチャー (`python tools/launcher.py start headless-components`) からも両方まとめて起動できる。
ポートは 5210 / 5211 固定（Vite 既定の 5173 は使わない）。右上のリンクで、同じページをもう一方の版で開ける。
