import { defineConfig } from "vitest/config"

// 各パッケージ / アプリの vitest.config.ts をプロジェクトとしてまとめて流す。
export default defineConfig({
  test: { projects: ["packages/*", "apps/*"] },
})
