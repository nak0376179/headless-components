import { aliases } from "../aliases"

// ポートは work/github の tools/launcher.json と揃えてある (5173 は使わない)。
export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  // 構成を React 版とそろえて src/ の下に置く (Nuxt 4 の既定は app/)。
  srcDir: "src/",
  // SPA (SSR はしない)。build は nuxt generate で静的な .output/public を作る。
  ssr: false,
  // utils / demo-data はコピーせず、ここから別名で参照する (tsconfig の paths も Nuxt が作る)。
  alias: aliases,
  css: ["vuetify/styles", "@mdi/font/css/materialdesignicons.css"],
  build: { transpile: ["vuetify"] },
  // components/ の .ts (RenderValue・テスト) はコンポーネントとして登録しない。
  components: [{ path: "~/components", extensions: ["vue"] }],
  typescript: {
    // リポジトリ全体 (tsconfig.base.json) とそろえる。utils / demo-data もこの設定で検査される。
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: false,
        types: ["vitest/globals", "@testing-library/jest-dom"],
      },
    },
  },
  hooks: {
    // ⚠ Nuxt の別名は "@" (= src) が先に並ぶので、そのままだと "@/utils" が src/utils を探しに行く。
    //   共有の utils を指す別名を先頭に並べ直す (取り込み先のアプリは src/utils が実在するので要らない)。
    "vite:extendConfig"(config) {
      const resolve = config.resolve as { alias?: Record<string, string> } | undefined
      if (resolve) resolve.alias = { ...aliases, ...resolve.alias }
    },
  },
  devServer: { port: 5211 },
  devtools: { enabled: false },
  telemetry: false,
})
