import { fileURLToPath } from "node:url"
import { defineProject } from "vitest/config"
import react from "@vitejs/plugin-react"
import { aliases } from "../aliases"

export default defineProject({
  plugins: [react()],
  resolve: { alias: { ...aliases, "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { name: "react", environment: "jsdom", globals: true, setupFiles: "../test/setup.ts" },
})
