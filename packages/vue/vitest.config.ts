import { defineProject } from "vitest/config"
import vue from "@vitejs/plugin-vue"

export default defineProject({
  plugins: [vue()],
  test: { name: "vue", environment: "jsdom", globals: true, setupFiles: "../../test/setup.ts" },
})
