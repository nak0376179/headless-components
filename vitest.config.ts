import { defineConfig } from "vitest/config"

// 各ディレクトリの vitest.config.ts をプロジェクトとしてまとめて流す。
export default defineConfig({
  test: { projects: ["core", "demo-data", "react", "nuxt"] },
})
