# CLAUDE.md

コーディングエージェント向けの案内。全体像は [README.md](README.md)、設計の理由は [docs/architecture.md](docs/architecture.md)、
CSV 変換の仕様は [docs/csv-json-spec.md](docs/csv-json-spec.md)。

## 設計の約束

- **振る舞いは `core/` に書く**。React / Vue / MUI / Vuetify / Nuxt を import しない (ESLint の `no-restricted-imports` で止まる)。
- core の機能は「`ReadableStore` (`get` / `subscribe`) で状態を公開するコントローラ」にそろえる (`createXxx(...)`)。状態は不変オブジェクトで、変更のたびに差し替える (`createStore().patch`)。`get()` は状態が変わらなければ同じ参照を返す (useSyncExternalStore の前提)。
- **core はコピーしない**。React / Nuxt からは別名 `@core` (= `core/src`) で参照する。別名の定義は [aliases.ts](aliases.ts) (Vite・Nuxt・vitest) と tsconfig の `paths` (react/tsconfig.json・tsconfig.base.json)。Nuxt の tsconfig は Nuxt が alias から作る。
- 部品 (取り込み対象) は `react/src/{components,hooks}` と `nuxt/src/{components,composables}`。
  - フック / composable は core を購読する薄いものだけ。見た目を持たない。
  - components は状態を描いてコントローラのメソッドを呼ぶだけ。**同じ機能は MUI 版と Vuetify 版で props・文言をそろえる** (文言の組み立ては `csvJsonErrorHeading` のように core 側の関数にしておくと揃えやすい)。
  - 部品の中の import は `@core/...` / `@/hooks/...` / `@/composables/...` / 同じフォルダの相対だけ。**デモ (`@demo-data`・`@/demo`・`@/pages`) を参照しない** (ESLint で止まる。取り込み先に無い)。
  - Nuxt の部品は自動 import に頼らず明示的に import する (テストは素の Vue で流す・Nuxt 以外にも持っていけるように)。ページ・レイアウトは自動 import (`useRoute`・`navigateTo`) を使ってよい。
  - **デモ専用の部品は `src/demo/` に置く** (components/ に置くと取り込まれる。Nuxt は pages/ の .vue を全部ルートにするので pages/ にも置けない)。
- 演出系 (effects) は DOM を直接操作するコントローラ。部品は `<div root><div content>children</div><div overlay/></div>` を描き、`useMounted` で取り付ける。`destroy()` は作ったノード・リスナー・タイマーを全部片付けること (React StrictMode の二重マウントで確かめる)。
- サーバーページネーション・無限スクロールは `core/src/data-table/cursor-query.ts` (TanStack Query の InfiniteQueryObserver)。Observer の購読はストアの購読者がいる間だけ。`destroy()` で購読を外さない (StrictMode が後始末を空打ちして同じコントローラを使い続けるため)。QueryClient はフック / composable の `useAppQueryClient` がアプリの Provider / プラグインから取る。
- **バックエンドは立てない**。サーバー役が要るデモは `createMemorySource` (カーソル方式の模擬 API) を使う。

## 構成・コマンド

- パッケージはビルドしない。Vite / Nuxt が core・demo-data をソースのまま取り込む。
- デモは `react/` (5210) と `nuxt/` (5211)。**URL は両方 `/<tab>/<page>`** で、同じパスなら同じデモ (右上のリンクで行き来)。
  - 画面一覧 (上位タブ → 小タブ、名前、並び) は [demo-data/src/nav.ts](demo-data/src/nav.ts) の `NAV` が正。ページを足すときは NAV に 1 行足し、`react/src/pages/<tab>/<page>.tsx` (default export) と `nuxt/src/pages/<tab>/<page>.vue` を**両方**作る (片方だけだと `nav.test.ts` が落ちる)。slug を変えたら nav.ts の `ALIASES` に古い名前を残す。旧版の `#slug` も `resolveNav` が読み替える。
  - ページ下部の「コードの使い方」は `src/demo/usage/index.ts` の `usageBySlug`。コード例は `usage/` の実ファイル (型検査を通る) か、ページのソースそのものを `?raw` で読む (文字列に直接書かない。API とずれたら `pnpm check` で気づけるように)。
- `pnpm test` はルートの `vitest.config.ts` の projects (core / demo-data / react / nuxt) を流す。jsdom に無い API のスタブは `test/setup.ts`。
- `pnpm check` = format:check → lint → typecheck → test → build。push 前に通す。Nuxt はここで SSR のビルドまで通る。
- SSR で落ちないか・ハイドレーションが合うかは、`pnpm --filter hc-nuxt build` → `PORT=4211 node nuxt/.output/server/index.mjs` で全ページを開いて確かめる (dev では出ない不一致がある)。

## アプリへの取り込み

- npm には出していない。`scripts/vendor.mjs` (`pnpm vendor <アプリ> --ui react|nuxt`) でコピーする。入る場所はこのリポジトリと同じ (`src/core/`・`src/components/`・`src/hooks/` or `src/composables/`) なので import の書き換えはしない。
- 取り込み記録は `src/core/.vendored.json`。記録に無い同名ファイルがあれば上書きせず止まる。
- 新しい外部依存を足したら、使う側 (core なら core/package.json、部品なら react/ か nuxt/ の package.json) の dependencies に書く (vendor がアプリに足りないものとして表示する。デモ専用の依存は vendor.mjs の `DEMO_ONLY`)。core の依存は react/・nuxt/ の dependencies にも同じ版で書く (Nuxt の SSR は nuxt/ から解決できない依存をバンドルに埋め込んでしまうため)。

## 注意

- Vue 側で TanStack の `table` 自体はリアクティブではない。テンプレートで `table` を読む箇所は、`useDataTable` の `state` を読んで依存を作る (`TableView.vue` の `version` prop)。
- React 側で `useDataTable` に渡す `data` を描画のたびに新しい配列にすると、`setData` → 再描画が止まらない。`useMemo` で包む (`CursorTable.tsx`)。
- Nuxt の SSR: setup で `requestAnimationFrame` や `window` に触らない (`onMounted` で)。テンプレートの `<component :is="'style'">` に文字を子として入れると SSR で `"` が `&quot;` になり CSS が壊れてハイドレーションも合わない → `v-html` で入れる (`demo/DemoPage.vue`)。
- Nitro はサーバーのバンドルで `typeof window` を文字列の中まで `"undefined"` に置き換える。papaparse が壊れるので `nuxt.config.ts` の `nitro.replace` で止めている。
- Vuetify の `v-tabs` は項目の差し替え中にも `update:model-value` を出す。値が今の一覧にあるか確かめてから動く (`layouts/default.vue`)。
- MUI は v9、Vuetify は v4、Nuxt は 4、react-router は 8、TanStack Query は v5。
