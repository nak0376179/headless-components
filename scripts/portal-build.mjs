#!/usr/bin/env node
// デモを nak-portal (管理者だけが見られる /admin/web/<名前>/) に上げるためのビルド。
// nak-portal の config/web.json の build から呼ばれる (npm run publish-web -- hc-react hc-nuxt)。
//
//   node scripts/portal-build.mjs react   # → react/dist (/admin/web/hc-react/ の下で動く)
//   node scripts/portal-build.mjs nuxt    # → nuxt/.output/public (/admin/web/hc-nuxt/ の下で動く)
//
// どちらも先に pnpm csv:report を流し、CSV/TSV の「テスト結果」のページをその時点の結果にする (テストが落ちたら上げない)。
// 置き場は「見つからなければ index.html」をしないので、画面ごとに index.html を置いている
// (React は vite.config.ts の hc-page-copies、Nuxt は generate がページごとに作る)。
import { execSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PORTAL = "/admin/web"
const which = process.argv[2]
if (which !== "react" && which !== "nuxt") throw new Error("react か nuxt を指定する")

const run = (command, env = {}) =>
  execSync(command, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } })

run("node scripts/csv-report.mjs")
if (which === "react") {
  run("pnpm --filter hc-react build", {
    HC_BASE: `${PORTAL}/hc-react/`,
    VITE_NUXT_URL: `${PORTAL}/hc-nuxt`, // 右上の「Nuxt 版」のリンク先
  })
} else {
  run("pnpm --filter hc-nuxt build", {
    NUXT_APP_BASE_URL: `${PORTAL}/hc-nuxt/`,
    NUXT_PUBLIC_REACT_URL: `${PORTAL}/hc-react`, // 右上の「React 版」のリンク先
  })
}
