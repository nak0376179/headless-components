import { defineProject } from "vitest/config"

export default defineProject({
  test: {
    name: "demo-data",
    environment: "jsdom",
    globals: true,
    setupFiles: "../../test/setup.ts",
  },
})
