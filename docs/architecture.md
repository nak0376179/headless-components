# 設計: core を React と Nuxt で共有する

2026-10-02 に、6 パッケージ構成 (`packages/{core,react,vue,mui,vuetify,demo-data}` + `apps/demo-*`) から
`core/` + `react/` + `nuxt/` の構成に組み直した。そのときに決めたことと理由。

## 1. core は「別名で参照」する (コピーもリンクもしない)

React 版と Nuxt 版は、同じ core を使う。共有の仕方は 3 通り考えた。

| 方法                              | 良いところ                 | 困るところ                                                                                              |
| --------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| 各アプリの `src/core/` にコピー   | アプリの中だけで完結する   | 直すたびに 2 か所へ写す。ずれても気づけない                                                             |
| `src/core` をシンボリックリンクに | 見た目は各アプリの中にある | Windows では開発者モードか管理者権限が要り、git も既定 (`core.symlinks=false`) ではただのファイルにする |
| **別名 `@core` → `core/src`**     | 実体は 1 つ。OS を問わない | アプリのフォルダの外を指す (ツールの設定が要る)                                                         |

**別名にした**。設定は [aliases.ts](../aliases.ts) にまとめ、Vite (react)・Nuxt・vitest が同じものを読む。
TypeScript の `paths` は react/tsconfig.json と tsconfig.base.json に同じ対応を書いた (Nuxt の tsconfig は Nuxt が alias から作る)。

別のアプリへ持っていくときは `src/core/` に**コピー**して同じ別名 `@core` を張る (`pnpm vendor`)。
このリポジトリでは「リンク」、アプリでは「コピー」だが、**import 文 (`from "@core"`) はどちらでも同じ**になる。

```ts
import { createCsvJson, email } from "@core" // 全部
import { createDataTable } from "@core/data-table" // 機能ごとにも読める
```

### 部品 (components / hooks) の置き場所

最初の構成では「MUI で包んだもの」も「フック」も別パッケージだったが、アプリの普通の構成
(`src/components/`・`src/hooks/`・`src/composables/`) に置いた。

- 取り込み先でも同じ場所に入るので、部品の中の `@/hooks/useStore` のような import が書き換えなしで通る。
- **デモ専用のもの**は `src/demo/` に分けた。components/ に置くと取り込まれてしまうし、
  Nuxt は pages/ の中の .vue をすべてルートにするので pages/ にも置けない。
- 部品からデモを参照しないことは ESLint (`no-restricted-imports`) で止めている。

ヘッドレスでない見た目だけの部品 (カードなど) も、作るなら同じく components/ に置く。

## 2. ヘッドレスなライブラリを core の中で使う

core は「状態を `ReadableStore` (`get` / `subscribe`) で公開するコントローラ」で統一している。
React は `useSyncExternalStore`、Vue は `shallowRef` で購読するだけなので、フック / composable は数行で済む。
その中身に、フレームワーク非依存の版があるライブラリを使う。

| 機能                                     | ライブラリ           | 備考                                                                   |
| ---------------------------------------- | -------------------- | ---------------------------------------------------------------------- |
| CSV/TSV の解析 (一括入力)                | papaparse            | 共通化に一番向いている。変換・検証・エラー文言まで core                |
| データテーブル                           | @tanstack/table-core | React / Vue のアダプタは使わず、core の `createDataTable` が状態を持つ |
| サーバーページネーション・無限スクロール | @tanstack/query-core | `InfiniteQueryObserver` を core の中で使う (下記)                      |

### TanStack Query をどう使うか

TanStack Query には React (`useInfiniteQuery`) と Vue の版があるが、それぞれで書くと
「前へ・次へ・検索の待ち・どのページを見ているか」の扱いを 2 回書くことになる。そこで:

- core の `createCursorPager` / `createInfiniteList` が `InfiniteQueryObserver` (query-core) を持ち、
  画面側の状態 (見ているページ・入力中の検索語) と合わせて 1 つのストアにする。API は前と同じ。
- **QueryClient はアプリのもの**を使う。フック / composable の `useAppQueryClient` が
  React の `QueryClientProvider` / Vue の `VueQueryPlugin` から取って core に渡す。無ければ core 内の共有のもの。
  アプリの他の部分と同じキャッシュになるので、`queryKey` を渡しておけば
  `queryClient.invalidateQueries({ queryKey })` で一覧を読み直させられる。
- 読んだページは無限クエリとして積むので、「前へ」・一度見たページ・前の検索語はキャッシュから即座に出る。
- Observer を購読する (= 取りに行く) のは、ストアの購読者がいる間だけ。React の StrictMode は
  購読 → 解除 → 再購読をするが、同じコントローラを使い続けられる。サーバー (SSR) では取りに行かない。

## 3. Nuxt を選んだことで気をつけること

Vue 版は Nuxt 4 (SSR あり) にした。実際のアプリで使うときに SSR で困らないかをここで確かめるため。

- `pnpm check` で Nuxt の本番ビルド (SSR) まで通す。ハイドレーションの不一致は dev では出ないことがあるので、
  ビルドしたサーバー (`node nuxt/.output/server/index.mjs`) で全ページを開いて確かめる。
- setup で `window`・`requestAnimationFrame` に触らない (`onMounted` で)。`useMounted` は onMounted で取り付ける。
- core の依存 (papaparse など) は nuxt/ の dependencies にも書く。nuxt/ から解決できない依存は、
  Vite の SSR ビルドがサーバーのバンドルに埋め込んでしまう。
- Nitro はサーバーのバンドルで `typeof window` を**文字列の中まで** `"undefined"` に置き換える。
  papaparse は Worker 用のコードを文字列で持っていてそこに当たり、壊れた JS になる。
  `nitro.replace` で `"typeof window": "typeof window"` として止めた (取り込み先の Nuxt アプリでも要る)。

## 4. 画面一覧を 1 つにする

デモの画面一覧 (上位タブ → 小タブ) は [demo-data/src/nav.ts](../demo-data/src/nav.ts) の `NAV` だけに書き、
React (react-router) と Nuxt (ファイルベースのルーティング) が同じ URL `/<tab>/<page>` を持つ。
React は `pages/<tab>/<page>.tsx` を `import.meta.glob` で NAV に割り当て、Nuxt は pages/ のファイルがそのままルートになる。
両方にページがあるかは `nav.test.ts` が確かめる。
