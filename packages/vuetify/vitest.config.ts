import { defineProject } from "vitest/config"
import vue from "@vitejs/plugin-vue"

export default defineProject({
  plugins: [vue()],
  test: {
    name: "vuetify",
    environment: "jsdom",
    globals: true,
    setupFiles: "../../test/setup.ts",
    // Vuetify のコンポーネントは各自 .css を import するので Vite に変換させる (外部化だと Node が .css を読めない)。
    server: { deps: { inline: ["vuetify"] } },
  },
})
