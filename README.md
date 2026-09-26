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

## アプリで使う (取り込み)

npm には公開していない。アプリの `src/libs/ui-kit/` に**丸ごとコピーして使う**（vendoring）。

```bash
cd <このリポジトリ>
pnpm vendor <アプリのディレクトリ> --ui mui        # React + MUI のアプリ
pnpm vendor <アプリのディレクトリ> --ui vuetify    # Vue + Vuetify のアプリ
```

- 取り込み先は `src/libs/ui-kit/{core, react, mui}`（Vue なら `{core, vue, vuetify}`）。`--name` / `--dest` で変えられる。
- 中の `@hc/*` の import は相対パスに書き換えるので、アプリ側に別名の設定は要らない。テストは含めない。
- 足りない依存パッケージは、バージョン付きの `pnpm add ...` として表示される（そのまま実行する。バージョン無しで入れると @tanstack/table-core の新しいメジャー版が入って型が合わない）。

```tsx
import { DataTable, CsvJsonTextArea } from "@/libs/ui-kit/mui"
import { email, type ColumnSpec } from "@/libs/ui-kit/core"
import { useCsvJson } from "@/libs/ui-kit/react" // 見た目を自作するとき
```

**取り込んだ中身は編集しない。** 直すときはこのリポジトリを直して取り込み直す（同じコマンドで上書き）。
アプリ固有の見た目や既定値は `src/components/` 側で包み直す。

- `pnpm vendor <アプリ> --check` … 取り込み後に手で書き換えられたファイルを一覧する（取り込み記録 `.vendored.json` と比較）。
- 書き換えがあると取り込み直しは中止する。取り込み記録の無いフォルダ（アプリのコード）は上書きしない。
- 取り込み元のコミットは `src/libs/ui-kit/VENDORED.md` に残る。

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
