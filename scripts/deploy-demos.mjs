#!/usr/bin/env node
// React 版・Nuxt 版のデモを Cloudflare Pages に公開する (出先・スマホから見るため)。
//
//   pnpm deploy:demos            # 両方をビルドして公開
//   pnpm deploy:demos --dry-run  # ビルドだけ (公開しない)
//
// 公開先: https://hc-react-demo.pages.dev / https://hc-nuxt-demo.pages.dev
// どちらもサーバーの要らない静的な SPA。データはブラウザ内の模擬 API (架空の社員) なので、見られて困るものは無い。
// Pages は 404.html が無ければ知らないパスに index.html を返すので、/table/infinite などを直接開いても動く。
// wrangler は `npx wrangler login` 済みであること。
import { execSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SITES = {
  react: { project: "hc-react-demo", dir: "react/dist" },
  nuxt: { project: "hc-nuxt-demo", dir: "nuxt/.output/public" },
}
const url = (name) => `https://${SITES[name].project}.pages.dev`
const dryRun = process.argv.includes("--dry-run")

const run = (command, env = {}) =>
  execSync(command, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } })

// CSV/TSV の「テスト結果」のページに載せる結果を、今のコードで取り直す (失敗していたら公開しない)
run("node scripts/csv-report.mjs")
// 右上の「もう一方の版」のリンクを、公開先どうしに向けてビルドする
run("pnpm --filter hc-react build", { VITE_NUXT_URL: url("nuxt") })
run("pnpm --filter hc-nuxt build", { NUXT_PUBLIC_REACT_URL: url("react") })

if (dryRun) {
  console.log("--dry-run: ビルドだけした")
} else {
  for (const [name, site] of Object.entries(SITES)) {
    run(
      `npx wrangler@4 pages deploy ${site.dir} --project-name ${site.project} --branch main --commit-dirty=true`,
    )
    console.log(`${name}: ${url(name)}`)
  }
}
