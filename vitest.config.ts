import { defineConfig } from "vitest/config"

// 各ディレクトリの vitest.config.ts をプロジェクトとしてまとめて流す。
export default defineConfig({
  test: {
    projects: ["utils", "demo-data", "react", "nuxt"],
    // 別チームへ渡す CSV/TSV (pnpm handoff の中身) はカバレッジ 100% を保つ。下回ると pnpm test が失敗する。
    coverage: {
      provider: "v8",
      include: ["utils/src/csv-json/**/*.ts", "utils/src/store.ts"],
      exclude: ["**/*.test.ts"],
      reporter: ["text-summary"],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
})
