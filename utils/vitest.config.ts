import { defineProject } from "vitest/config"

export default defineProject({
  test: { name: "utils", environment: "jsdom", globals: true, setupFiles: "../test/setup.ts" },
})
