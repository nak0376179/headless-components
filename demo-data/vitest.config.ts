import { defineProject } from "vitest/config"
import { aliases } from "../aliases"

export default defineProject({
  resolve: { alias: aliases },
  test: { name: "demo-data", environment: "jsdom", globals: true, setupFiles: "../test/setup.ts" },
})
