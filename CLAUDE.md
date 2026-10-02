# CLAUDE.md

コーディングエージェント向けの案内。全体像は [README.md](README.md)、設計の理由は [docs/architecture.md](docs/architecture.md)、
CSV/TSV 変換の使い方と仕様は [utils/src/csv-json/README.md](utils/src/csv-json/README.md)・[SPEC.md](utils/src/csv-json/SPEC.md)。

## main と draft

- **main は 2 つだけ**: CSV/TSV → JSON 変換 (`csv-json`) と、データテーブル (`data-table`: 取得は TanStack Query + `fetchAllPages`、TanStack Table でクライアント側のページング・フリーワード検索)。
- それ以外 (フォーム・ダイアログ・カード・サーバーページネーション・無限スクロール・演出) は **draft**。`utils/src/draft`・`react/src/{components,hooks}/draft`・`nuxt/src/{components,composables}/draft` に置き、`demo-data/src/nav.ts` のタブに `draft: true` を付ける (デモでは「🧪 Draft」の後ろに出て、ページに注記が出る)。
- **main から draft を import しない** (ESLint で止まる)。`pnpm vendor` の既定は main だけで、draft を参照していると取り込み先で import が切れる。
- draft を main に上げるときは、`draft/` から出して nav の `draft` を外し、README の表を直す。

## 設計の約束

- **振る舞いは `utils/` に書く**。React / Vue / MUI / Vuetify / Nuxt を import しない (ESLint の `no-restricted-imports` で止まる)。
- utils の機能は「`ReadableStore` (`get` / `subscribe`) で状態を公開するコントローラ」にそろえる (`createXxx(...)`)。状態は不変オブジェクトで、変更のたびに差し替える (`createStore().patch`)。`get()` は状態が変わらなければ同じ参照を返す (useSyncExternalStore の前提)。
- アプリでは utils を **`src/utils/`** に置く想定。import は `@/utils` (main) / `@/utils/draft` (draft)。このリポジトリでは utils をコピーせず、各アプリの `@/utils` を `utils/src` に向けている。別名は [aliases.ts](aliases.ts) (Vite・Nuxt・vitest) と tsconfig の `paths` (react/tsconfig.json・tsconfig.base.json)。**`@/utils` は `@` より先に並べる** (前から当てはめるので、`@` が先だと `src/utils` を探す)。Nuxt は自分の `@` が先に並ぶので `nuxt.config.ts` の `vite:extendConfig` で並べ直している。
- 部品 (取り込み対象) は `react/src/{components,hooks}` と `nuxt/src/{components,composables}`。
  - フック / composable は utils を購読する薄いものだけ。見た目を持たない。
  - components は状態を描いてコントローラのメソッドを呼ぶだけ。**同じ機能は MUI 版と Vuetify 版で props・文言をそろえる** (文言の組み立ては `csvJsonErrorHeading` のように utils 側の関数にしておくと揃えやすい)。
  - 部品の中の import は `@/utils/...` / `@/hooks/...` / `@/composables/...` / `@/components/...` / 同じフォルダの相対だけ。**デモ (`@demo-data`・`@/demo`・`@/pages`) を参照しない** (ESLint で止まる)。
  - Nuxt の部品は自動 import に頼らず明示的に import する (テストは素の Vue で流す・Nuxt 以外にも持っていけるように)。ページ・レイアウトは自動 import (`useRoute`・`navigateTo`) を使ってよい。
  - **デモ専用の部品は `src/demo/` に置く** (components/ に置くと取り込まれる。Nuxt は pages/ の .vue を全部ルートにするので pages/ にも置けない)。
- データテーブル: `DataTable` は `data`・`loading`・`error`・`onRetry` (Vue は `@retry`) を受ける。取得はアプリ側の `useQuery` で行い、結果を渡すだけ (部品は TanStack Query に依存しない)。
- 演出系 (draft/effects) は DOM を直接操作するコントローラ。部品は `<div root><div content>children</div><div overlay/></div>` を描き、`useMounted` で取り付ける。`destroy()` は作ったノード・リスナー・タイマーを全部片付けること (React StrictMode の二重マウントで確かめる)。
- サーバーページネーション・無限スクロール (draft) は `utils/src/draft/data-table/cursor-query.ts` (TanStack Query の InfiniteQueryObserver)。Observer の購読はストアの購読者がいる間だけ。`destroy()` で購読を外さない (StrictMode が後始末を空打ちして同じコントローラを使い続けるため)。
- **バックエンドは立てない**。サーバー役が要るデモは `createMemorySource` (カーソル方式の模擬 API) を使う。

## CSV/TSV の書き出し (別チームへ渡す)

- `pnpm handoff` (`scripts/handoff.mjs`) が `utils/src/csv-json` + `store.ts` を、README・仕様・テスト付きの `utils/` フォルダとして `handoff/csv-json/` に書き出す (git 管理外)。`--zip`・`--verify` (空のプロジェクトで papaparse だけで型検査とテスト)。
- そのため **csv-json は `papaparse`・`../store`・同じフォルダ以外を import しない** (`utils/handoff.test.ts` が検査する)。React / Vue のコードも入れない。
- `utils/src/csv-json/README.md` のコード例は `<!-- file: … -->` で実ファイル (`react/src/demo/usage/csv-json/*`・`nuxt/src/demo/usage/csv-json/*`。型検査を通る) を埋め込んでいる。例を直したら `pnpm handoff --sync` (ずれていると `handoff.test.ts` が落ちる)。
- 渡した後に直すときは、このリポジトリを直して書き出し直す。

## 構成・コマンド

- パッケージはビルドしない。Vite / Nuxt が utils・demo-data をソースのまま取り込む。
- デモは `react/` (5210) と `nuxt/` (5211)。**URL は両方 `/<tab>/<page>`** で、同じパスなら同じデモ (右上のリンクで行き来)。既定のページは `/csv-json/convert`。
  - 画面一覧 (上位タブ → 小タブ、名前、並び、draft) は [demo-data/src/nav.ts](demo-data/src/nav.ts) の `NAV` が正。ページを足すときは NAV に 1 行足し、`react/src/pages/<tab>/<page>.tsx` (default export) と `nuxt/src/pages/<tab>/<page>.vue` を**両方**作る (片方だけだと `nav.test.ts` が落ちる)。slug を変えたら nav.ts の `ALIASES` に古い名前を残す。旧版の `#slug` も `resolveNav` が読み替える。
  - ページ下部の「コードの使い方」は `src/demo/usage/index.ts` の `usageBySlug` (キーはページの slug)。コード例は `usage/` の実ファイル (型検査を通る) か、ページのソースそのものを `?raw` で読む (文字列に直接書かない)。
- `pnpm test` はルートの `vitest.config.ts` の projects (utils / demo-data / react / nuxt) を流す。jsdom に無い API のスタブは `test/setup.ts`。
- `pnpm check` = format:check → lint → typecheck → test → build。push 前に通し、**終了コードを見てから** push する。Nuxt は SPA (`ssr: false`) で、build は `nuxt generate` (静的な `nuxt/.output/public`)。

## アプリへの取り込み (部品ごと)

- npm には出していない。`scripts/vendor.mjs` (`pnpm vendor <アプリ> --ui react|nuxt [--draft]`) でコピーする。入る場所はこのリポジトリと同じ (`src/utils/`・`src/components/`・`src/hooks/` or `src/composables/`) なので import の書き換えはしない。アプリには `@` → src の別名だけあればよい。
- 取り込み記録は `src/utils/.vendored.json`。記録に無い同名ファイルがあれば上書きせず止まる。
- 新しい外部依存を足したら、使う側 (utils なら utils/package.json、部品なら react/ か nuxt/ の package.json) の dependencies に書く (vendor がアプリに足りないものとして表示する。デモ専用の依存は vendor.mjs の `DEMO_ONLY`、draft だけの依存は `DRAFT_ONLY`)。utils の依存は react/・nuxt/ の dependencies にも同じ版で書く。

## 注意

- Vue 側で TanStack の `table` 自体はリアクティブではない。テンプレートで `table` を読む箇所は、`useDataTable` の `state` を読んで依存を作る (`TableView.vue` の `version` prop)。
- React 側で `DataTable` / `useDataTable` に渡す `data` を描画のたびに新しい配列にすると、`setData` → 再描画が止まらない。取得前も同じ空配列 (`const EMPTY = []`) を渡す・加工するなら `useMemo`。
- Nuxt は SPA (`ssr: false`。2026-10-02 に決めた)。SSR に戻すなら、papaparse が Nitro の `typeof window` 置き換えで壊れる・`<component :is="'style'">` の文字が SSR でエスケープされる、の 2 点に当たる ([docs/architecture.md](docs/architecture.md))。
- Nuxt はアプリの `utils/` を自動 import する。取り込み先の Nuxt アプリでは `src/utils/index.ts` の export が全部グローバルに入るので、名前がぶつかったら import を明示する。
- Vuetify の `v-tabs` は項目の差し替え中にも `update:model-value` を出す。値が今の一覧にあるか確かめてから動く (`layouts/default.vue`)。
- Windows で zip を作るときは System32 の `tar.exe` を使う (Git Bash の GNU tar は zip を作れず、`C:` をホスト名と読む)。
- MUI は v9、Vuetify は v4、Nuxt は 4、react-router は 8、TanStack Query は v5。
