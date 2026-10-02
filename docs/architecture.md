# 設計: utils を React と Nuxt で共有する

2026-10-02 に、6 パッケージ構成 (`packages/{core,react,vue,mui,vuetify,demo-data}` + `apps/demo-*`) から
`utils/` + `react/` + `nuxt/` の構成に組み直した。そのときに決めたことと理由。

## 1. utils は `src/utils` に置く想定。このリポジトリでは「別名で参照」する

フレームワーク非依存のロジックは `utils/`。アプリでは `src/utils/` に置く想定なので、import は `@/utils` になる
(最初は `core` / `@core` という名前だったが、普通のアプリの構成に合わせて改めた)。
アプリ側には `@` → `src` の別名さえあればよく、Vite・Next.js・Nuxt の雛形には最初からある。

このリポジトリの React 版と Nuxt 版は、同じ utils を使う。共有の仕方は 3 通り考えた。

| 方法                               | 良いところ                 | 困るところ                                                                                              |
| ---------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| 各アプリの `src/utils/` にコピー   | アプリの中だけで完結する   | 直すたびに 2 か所へ写す。ずれても気づけない                                                             |
| `src/utils` をシンボリックリンクに | 見た目は各アプリの中にある | Windows では開発者モードか管理者権限が要り、git も既定 (`core.symlinks=false`) ではただのファイルにする |
| **別名 `@/utils` → `utils/src`**   | 実体は 1 つ。OS を問わない | アプリのフォルダの外を指す (ツールの設定が要る)                                                         |

**別名にした**。設定は [aliases.ts](../aliases.ts) にまとめ、Vite (react)・Nuxt・vitest が同じものを読む。
TypeScript の `paths` は react/tsconfig.json と tsconfig.base.json に同じ対応を書いた (Nuxt の tsconfig は Nuxt が alias から作る)。

- `@/utils` は `@` より**先に**並べる。別名は前から当てはめるので、`@` が先だと `src/utils` (このリポジトリには無い) を探す。
  Nuxt は自分の `@` を先に並べるので、`nuxt.config.ts` の `vite:extendConfig` で並べ直している
  (TypeScript は長く一致する方を選ぶので、型検査だけ通って画面が出ない、という形で気づいた)。
- 別のアプリへは `src/utils/` に**コピー**する (`pnpm vendor`)。このリポジトリでは「リンク」、アプリでは「コピー」だが、
  **import 文 (`from "@/utils"`) はどちらでも同じ**になる。

### 部品 (components / hooks) の置き場所

最初の構成では「MUI で包んだもの」も「フック」も別パッケージだったが、アプリの普通の構成
(`src/components/`・`src/hooks/`・`src/composables/`) に置いた。

- 取り込み先でも同じ場所に入るので、部品の中の `@/hooks/useStore` のような import が書き換えなしで通る。
- **デモ専用のもの**は `src/demo/` に分けた。components/ に置くと取り込まれてしまうし、
  Nuxt は pages/ の中の .vue をすべてルートにするので pages/ にも置けない。
- 部品からデモを参照しないことは ESLint (`no-restricted-imports`) で止めている。

## 2. main と draft

作ったものが増えたので、**main を 2 つに絞った** (2026-10-02):

1. **CSV/TSV → JSON 変換** — 共通化に一番向いている (変換・検証・エラー文言まで utils に入る)。
2. **データテーブル** — 取得は TanStack Query (react-query / vue-query の `useQuery`)、表示は TanStack Table で
   クライアント側のページング・並べ替え・フリーワード検索。

それ以外 (フォーム・ダイアログ・カード・サーバーページネーション・無限スクロール・演出) は **draft** として残す。

- コードは各所の `draft/` フォルダへ (`utils/src/draft`・`components/draft`・`hooks/draft`・`composables/draft`)。
  import は `@/utils/draft`。main から draft は参照しない (ESLint)。
- `pnpm vendor` の既定は main だけ (`--draft` で全部)。main だけなら React 版で 16 ファイル。
- デモは main のタブを先に、draft を「🧪 Draft」の後ろに控えめに並べ、ページの上に注記を出す。

### データテーブルで TanStack Query をどこに置くか

取得はアプリの `useQuery` で行い、結果を `DataTable` に渡すだけにした (部品は TanStack Query に依存しない)。

```tsx
const { data, error, isFetching, refetch } = useQuery({
  queryKey: ["employees"],
  queryFn: () => fetchAllPages(fetchEmployees, 250),
})
<DataTable data={data ?? EMPTY} columns={columns} loading={isFetching} error={error?.message} onRetry={refetch} />
```

- API がカーソル方式 (1 ページずつ) なら、utils の `fetchAllPages` で全件にまとめる。
- キャッシュ・再取得・エラーの扱いはアプリの他の部分と同じ QueryClient に乗る。
- ページング・検索は手元でやるので、件数が数千件を超えて重くなったら draft のサーバーページネーション
  (`createCursorPager`。query-core の `InfiniteQueryObserver` を utils の中で使う) を検討する。

## 3. CSV/TSV だけを別チームへ渡す

CSV/TSV → JSON は、相手が React / Next.js / Vue / Nuxt のどれでも**フォルダを配るだけで使える**形にした。

- `pnpm handoff` が `utils/` フォルダ (README・仕様・テスト・`csv-json/`・`store.ts`・`index.ts`) を書き出す。
  画面の部品は入れない (相手の UI ライブラリが分からないため)。代わりに README に、UI ライブラリなしの
  React / Vue の画面の例を載せる。
- 外への依存は **papaparse だけ**。そのため csv-json は `papaparse`・`../store`・同じフォルダ以外を import しない
  (`utils/handoff.test.ts` で検査)。中は相対パスなので、フォルダの名前や置き場所を変えても動く。
- `--verify` で、このリポジトリと無関係な空のプロジェクトに入れ、papaparse だけで型検査 (`@/utils` からの import を含む)
  と同梱のテストが通ることを確かめる。
- README のコード例は、リポジトリの中で型検査される実ファイルを埋め込む (`<!-- file: … -->`。`pnpm handoff --sync`)。
  ドキュメントのコードが API とずれない。
- テストは Vitest で書いてある。Jest のチームには、`from "vitest"` を外して `vi.fn` を `jest.fn` にする手順を README に書いた。
- papaparse を残したのは、引用符の中の改行・カンマ、区切りの自動判別などを自前で書くより確かなため。
  「依存ゼロ」が必要になったら、`convert.ts` の解析部分を置き換える (テストがそのまま仕様の確認になる)。

## 4. ヘッドレスなライブラリを utils の中で使う

utils は「状態を `ReadableStore` (`get` / `subscribe`) で公開するコントローラ」で統一している。
React は `useSyncExternalStore`、Vue は `shallowRef` で購読するだけなので、フック / composable は数行で済む。

| 機能                                             | ライブラリ           | 備考                                                                    |
| ------------------------------------------------ | -------------------- | ----------------------------------------------------------------------- |
| CSV/TSV の解析 (main)                            | papaparse            | 変換・検証・エラー文言まで utils                                        |
| データテーブル (main)                            | @tanstack/table-core | React / Vue のアダプタは使わず、utils の `createDataTable` が状態を持つ |
| サーバーページネーション・無限スクロール (draft) | @tanstack/query-core | `InfiniteQueryObserver` を utils の中で使う                             |

draft のサーバーページネーション・無限スクロールでは、TanStack Query の React / Vue の版をそれぞれ使うと
「前へ・次へ・検索の待ち・どのページを見ているか」を 2 回書くことになるので、utils の中で query-core を使った。
QueryClient はアプリのもの (`QueryClientProvider` / `VueQueryPlugin`) を `useAppQueryClient` で受け取る。
Observer を購読する (= 取りに行く) のはストアの購読者がいる間だけ (React の StrictMode の購読 → 解除 → 再購読に耐える)。

## 5. Nuxt は SPA で使う

Vue 版は Nuxt 4 を **SPA (`ssr: false`)** で使う。build は `nuxt generate` で、静的なファイル (`nuxt/.output/public`) になる。

最初は SSR ありで組んだが、使わないことにした (2026-10-02)。SSR に戻すときに当たったことを残しておく:

- Nitro はサーバーのバンドルで `typeof window` を**文字列の中まで** `"undefined"` に置き換える。
  papaparse は Worker 用のコードを文字列で持っていてそこに当たり、壊れた JS になる。
  `nitro: { replace: { "typeof window": "typeof window" } }` で止められる。
- utils の依存が nuxt/ から解決できないと、Vite の SSR ビルドがサーバーのバンドルに埋め込む
  (utils の依存は nuxt/ の dependencies にも書いてある)。
- テンプレートの `<component :is="'style'">` に文字を子として入れると、SSR で `"` が `&quot;` になって
  CSS が壊れ、ハイドレーションも合わない (`v-html` で入れる)。
- setup で `window`・`requestAnimationFrame` に触らない (`onMounted` で)。
- ハイドレーションの不一致は dev では出ないことがあるので、ビルドしたサーバーで全ページを開いて確かめる。

## 6. 画面一覧を 1 つにする

デモの画面一覧 (上位タブ → 小タブ、draft か) は [demo-data/src/nav.ts](../demo-data/src/nav.ts) の `NAV` だけに書き、
React (react-router) と Nuxt (ファイルベースのルーティング) が同じ URL `/<tab>/<page>` を持つ。
React は `pages/<tab>/<page>.tsx` を `import.meta.glob` で NAV に割り当て、Nuxt は pages/ のファイルがそのままルートになる。
両方にページがあるかは `nav.test.ts` が確かめる。
