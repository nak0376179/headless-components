# headless-components

React からも Vue からも呼び出せる**ヘッドレスなコンポーネントライブラリ**。ロジック（状態・振る舞い）は
フレームワーク非依存のコアに集め、見た目は **MUI（React）** と **Vuetify（Vue）** で包んで提供する。

[react-components](https://github.com/nak0376179/react-components) と
[vue-components](https://github.com/nak0376179/vue-components) を統合したもの。**バックエンドは持たない**
（旧 react-components の FastAPI + DynamoDB は、ブラウザ内で動く模擬 API に置き換えた）。

## 構成

```text
packages/
  core/       @hc/core      フレームワーク非依存のロジック (React/Vue を import しない。ESLint で禁止)
  react/      @hc/react     core を React で使うフック (useStore / useCsvJson / useDataTable / useCursorPager / useMounted)
  vue/        @hc/vue       core を Vue 3 で使う composable (同名)
  mui/        @hc/mui       react + MUI で包んだコンポーネント
  vuetify/    @hc/vuetify   vue + Vuetify で包んだコンポーネント
  demo-data/  @hc/demo-data デモ用データ (従業員の模擬 API・CSV サンプル)。両デモで共用
apps/
  demo-react/ React + MUI のデモ     http://localhost:5210
  demo-vue/   Vue + Vuetify のデモ   http://localhost:5211
```

依存の向き: `core` ← `react` ← `mui`、`core` ← `vue` ← `vuetify`。**振る舞いを直すときは core を直せば両方に効く。**

### コアの形

どの機能も「状態を `ReadableStore`（`get()` / `subscribe()`）で公開するコントローラ」になっている。

```ts
const c = createCsvJson({ columns })
c.subscribe(() => console.log(c.get().result))
c.setText("氏名,年齢\n山田,30")
c.convert()
```

- React は `useSyncExternalStore`、Vue は `shallowRef` で購読するだけ（`@hc/react` / `@hc/vue` の `useStore`）。
- 描画側の MUI / Vuetify コンポーネントは、状態を描いてコントローラのメソッドを呼ぶだけの薄い包み。
- 演出系（effects）は DOM を直接操作するコントローラで、ラッパーは host 要素を渡して `useMounted` で取り付ける。

## 機能

| 機能                                                  | core                                                                               | MUI / Vuetify     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------- |
| CSV/TSV → JSON/CSV/TSV 変換・検証                     | `convertDelimitedText` / `createCsvJson` / バリデータ (`zenkaku()` `email()` など) | `CsvJsonTextArea` |
| データテーブル (並べ替え・全体検索・ページング)       | `createDataTable` (@tanstack/table-core)                                           | `DataTable`       |
| カーソル方式のサーバーページネーション                | `createCursorPager` / `fetchAllPages` / `createMemorySource`                       | `CursorTable`     |
| 演出系 (ジグソー・ガラス割れ・隠しコマンド・モザイク) | `effects/`                                                                         | 各コンポーネント  |

CSV 変換の仕様の詳細は [docs/csv-json-spec.md](docs/csv-json-spec.md)。

列定義は TanStack Table の `ColumnDef` をそのまま使う（`createColumnHelper` は `@hc/core` から再公開）。
`header` / `cell` は値か関数で、関数の戻り値は React なら JSX、Vue なら `h()` の VNode を返せばよい。

## 開発

```bash
pnpm install
pnpm dev:react     # http://localhost:5210
pnpm dev:vue       # http://localhost:5211
pnpm test          # 全パッケージの vitest
pnpm check         # format:check → lint → typecheck → test → build
```

work/github のランチャー (`python tools/launcher.py start headless-components`) からも両方まとめて起動できる。
ポートは 5210 / 5211 固定（Vite 既定の 5173 は使わない）。
