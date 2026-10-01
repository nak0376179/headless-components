import { fileURLToPath } from "node:url"
import { defineProject } from "vitest/config"
import vue from "@vitejs/plugin-vue"
import { aliases } from "../aliases"

// 部品 (components / composables) のテストは Nuxt を起動せず、素の Vue + Vuetify で流す。
// そのため部品の中では Nuxt の自動 import に頼らず、明示的に import する。
export default defineProject({
  plugins: [vue()],
  resolve: { alias: { ...aliases, "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    name: "nuxt",
    environment: "jsdom",
    globals: true,
    setupFiles: "../test/setup.ts",
    include: ["src/components/**/*.test.ts", "src/composables/**/*.test.ts"],
    // Vuetify のコンポーネントは各自 .css を import するので Vite に変換させる (外部化だと Node が .css を読めない)。
    server: { deps: { inline: ["vuetify"] } },
  },
})
