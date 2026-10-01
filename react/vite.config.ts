import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { aliases } from "../aliases"

// ポートは work/github の tools/launcher.json と揃えてある (5173 は使わない)。
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { ...aliases, "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5210, strictPort: true },
  preview: { port: 4210, strictPort: true },
})
