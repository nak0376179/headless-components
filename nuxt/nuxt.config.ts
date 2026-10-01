import { aliases } from "../aliases"

// ポートは work/github の tools/launcher.json と揃えてある (5173 は使わない)。
export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  // 構成を React 版とそろえて src/ の下に置く (Nuxt 4 の既定は app/)。
  srcDir: "src/",
  // core / demo-data はコピーせず、ここから別名で参照する (tsconfig の paths も Nuxt が作る)。
  alias: aliases,
  css: ["vuetify/styles", "@mdi/font/css/materialdesignicons.css"],
  build: { transpile: ["vuetify"] },
  // components/ の .ts (RenderValue・テスト) はコンポーネントとして登録しない。
  components: [{ path: "~/components", extensions: ["vue"] }],
  typescript: {
    // リポジトリ全体 (tsconfig.base.json) とそろえる。core / demo-data もこの設定で検査される。
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: false,
        types: ["vitest/globals", "@testing-library/jest-dom"],
      },
    },
  },
  // ⚠ Nitro はサーバー側のバンドルで "typeof window" を文字列のまま "undefined" に置き換える。
  //   papaparse は文字列の中にこの句を持っているので、バンドルすると壊れた JS になる (2026-10-02)。
  //   置き換えを止める (サーバー側で window の有無を畳み込む最適化が効かなくなるだけ)。core を取り込んだ Nuxt アプリでも同じ設定が要る。
  nitro: { replace: { "typeof window": "typeof window" } },
  devServer: { port: 5211 },
  devtools: { enabled: false },
  telemetry: false,
})
