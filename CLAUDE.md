# CLAUDE.md

コーディングエージェント向けの案内。全体像は [README.md](README.md)、CSV 変換の仕様は [docs/csv-json-spec.md](docs/csv-json-spec.md)。

## 設計の約束

- **振る舞いは `packages/core` に書く**。React / Vue / MUI / Vuetify を import しない (ESLint の `no-restricted-imports` で止まる)。
- コアの機能は「`ReadableStore` (`get` / `subscribe`) で状態を公開するコントローラ」にそろえる (`createXxx(...)`)。状態は不変オブジェクトで、変更のたびに差し替える (`createStore().patch`)。
- `@hc/react` / `@hc/vue` はコアを購読する薄いフック / composable だけ。見た目を持たない。
- `@hc/mui` / `@hc/vuetify` は状態を描いてコントローラのメソッドを呼ぶだけ。**同じ機能は MUI 版と Vuetify 版で props・文言をそろえる** (文言の組み立ては `csvJsonErrorHeading` のようにコア側の関数にしておくと揃えやすい)。
- 演出系 (effects) は DOM を直接操作するコントローラ。ラッパーは `<div root><div content>children</div><div overlay/></div>` を描き、`useMounted` で取り付ける。`destroy()` は作ったノード・リスナー・タイマーを全部片付けること (React StrictMode の二重マウントで確かめる)。
- **バックエンドは立てない**。サーバー役が要るデモは `createMemorySource` (カーソル方式の模擬 API) を使う。

## 構成・コマンド

- パッケージはビルドせず、`exports` で `src/index.ts` を直接指す (デモの Vite がソースのまま取り込む)。
- デモは `apps/demo-react` (5210) と `apps/demo-vue` (5211)。`#slug` で同じデモが開く (右上のリンクで行き来できる)。
  - 演出系のデモは `demos/effects/*Demo.tsx` / `*Demo.vue` を置けば自動で登録される (`meta` を export する。Vue は `<script setup>` とは別の `<script>` ブロックで)。
  - それ以外のデモは `demos/registry.tsx` / `registry.ts` の `tabs` (上位タブ → 小タブ) に 1 行足す。先頭のタブの先頭が既定のページ。slug を変えたら `ALIASES` に古い slug を残す。
  - ページ下部の「コードの使い方」は `usage/index.ts` の `usageBySlug`。コード例は `usage/` の実ファイル (型検査を通る) か、デモのソースそのものを `?raw` で読む (文字列に直接書かない。API とずれたら `pnpm check` で気づけるように)。
- `pnpm test` は `vitest.config.ts` の projects で全パッケージを流す。jsdom に無い API のスタブは `test/setup.ts`。
- `pnpm check` = format:check → lint → typecheck → test → build。push 前に通す。

## アプリへの取り込み

- npm には出していない。アプリへは `scripts/vendor.mjs` (`pnpm vendor <アプリ> --ui mui|vuetify`) でコピーする。取り込み先は `src/libs/ui-kit/`。
- そのため **パッケージ間の import は必ず `@hc/<層>` から** 書く (vendor が相対パスに書き換える)。パッケージの中の相対 import で他の層を参照しない。
- 取り込まない層 (demo-data など) を core / react / vue / mui / vuetify から参照すると、vendor がエラーにする。
- 新しい外部依存を足したら、その層の package.json の dependencies / peerDependencies に書く (vendor がアプリに足りないものとして表示する)。

## 注意

- Vue 側で TanStack の `table` 自体はリアクティブではない。テンプレートで `table` を読む箇所は、`useDataTable` の `state` を読んで依存を作る (`TableView.vue` の `version` prop)。
- React 側で `useDataTable` に渡す `data` を描画のたびに新しい配列にすると、`setData` → 再描画が止まらない。`useMemo` で包む (`CursorTable.tsx`)。
- MUI は v9、Vuetify は v4。
