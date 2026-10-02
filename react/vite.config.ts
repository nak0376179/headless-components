import { copyFileSync, mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { aliases } from "../aliases"
import { NAV, navPath } from "../demo-data/src/nav"

const dist = fileURLToPath(new URL("./dist", import.meta.url))

/**
 * ビルドの後、画面ごと (/<tab>/<page>/) に index.html を複製する。
 * 「見つからなければ index.html」をしない置き場 (nak-portal の /admin/web/) でも、どのページを直接開いても動くように。
 */
const pageCopies = (): Plugin => ({
  name: "hc-page-copies",
  apply: "build",
  closeBundle() {
    for (const tab of NAV) {
      for (const page of tab.pages) {
        const dir = `${dist}${navPath(tab, page)}`
        mkdirSync(dir, { recursive: true })
        copyFileSync(`${dist}/index.html`, `${dir}/index.html`)
      }
    }
  },
})

// ポートは work/github の tools/launcher.json と揃えてある (5173 は使わない)。
// HC_BASE: 置き場のパス (nak-portal に上げるときは /admin/web/hc-react/。scripts/portal-build.mjs)。
export default defineConfig({
  base: process.env.HC_BASE ?? "/",
  plugins: [react(), pageCopies()],
  resolve: { alias: { ...aliases, "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5210, strictPort: true },
  preview: { port: 4210, strictPort: true },
})
