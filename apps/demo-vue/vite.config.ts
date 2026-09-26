import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

// ポートは work/github の tools/launcher.json と揃えてある (5173 は使わない)。
export default defineConfig({
  plugins: [vue()],
  server: { port: 5211, strictPort: true },
  preview: { port: 4211, strictPort: true },
})
