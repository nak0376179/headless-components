import { defineProject } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineProject({
  plugins: [react()],
  test: { name: "react", environment: "jsdom", globals: true, setupFiles: "../../test/setup.ts" },
})
