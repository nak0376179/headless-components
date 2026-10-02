#!/usr/bin/env node
// utils と部品をアプリにコピーして取り込む (vendoring)。npm には出していないので、これで配る。
//
//   pnpm vendor <アプリのディレクトリ> --ui react       # React + MUI のアプリ
//   pnpm vendor <アプリのディレクトリ> --ui nuxt        # Nuxt (Vue) + Vuetify のアプリ
//   pnpm vendor <アプリのディレクトリ> --check          # 取り込んだ後に手で書き換えられていないか
//   --draft     draft (フォーム・ダイアログ・演出・サーバーページネーション…) も取り込む (既定は main だけ)
//   --dry-run   書き込まずに何をするかだけ表示
//
// このリポジトリと同じ場所に置く:
//   utils/src/           → <アプリ>/src/utils/
//   react/src/components → <アプリ>/src/components/   (nuxt なら nuxt/src/components)
//   react/src/hooks      → <アプリ>/src/hooks/        (nuxt なら nuxt/src/composables)
// 部品の import は `@/utils/...` と `@/hooks/...` なので、アプリに `@` → src の別名があればそのまま通る
// (Nuxt は最初からある)。無ければ表示する。
// **取り込んだファイルは編集しない** (直すならこのリポジトリを直して取り込み直す)。
// 取り込み直しは前回の分を消して入れ替える。取り込み記録 (src/utils/.vendored.json) に無い同名ファイル
// (アプリのコード) があれば上書きせず中止する。
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MANIFEST = "utils/.vendored.json" // アプリの src/ からの相対
const README = "utils/VENDORED.md"
/** 取り込む元 (リポジトリの相対) → アプリの src/ の中の置き場所。 */
const LAYOUTS = {
  react: [
    ["utils/src", "utils"],
    ["react/src/components", "components"],
    ["react/src/hooks", "hooks"],
  ],
  nuxt: [
    ["utils/src", "utils"],
    ["nuxt/src/components", "components"],
    ["nuxt/src/composables", "composables"],
  ],
}
const UI_ALIASES = { mui: "react", vuetify: "nuxt", vue: "nuxt" }
/** デモにしか使っていない依存 (取り込み先には要らない)。 */
const DEMO_ONLY = new Set(["react-router", "nuxt", "vue-router"])
const SKIP = (rel) => /\.test\.[tj]sx?$/.test(rel)
/** draft/ の下のもの (--draft を付けたときだけ取り込む)。 */
const isDraft = (rel) => rel.split("/").includes("draft")
/** draft だけが使う依存。 */
const DRAFT_ONLY = new Set(["@tanstack/query-core"])

function parseArgs(argv) {
  const opts = { ui: null, check: false, dryRun: false, draft: false, app: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--ui") opts.ui = argv[++i]
    else if (a === "--check") opts.check = true
    else if (a === "--dry-run") opts.dryRun = true
    else if (a === "--draft") opts.draft = true
    else if (a === "-h" || a === "--help") opts.help = true
    else if (!a.startsWith("-") && !opts.app) opts.app = a
    else throw new Error(`不明な引数: ${a}`)
  }
  opts.ui = UI_ALIASES[opts.ui] ?? opts.ui
  return opts
}

const sha = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16)
const posix = (p) => p.split(path.sep).join("/")
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"))

function walk(dir, base = dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full, base))
    else out.push(posix(path.relative(base, full)))
  }
  return out.sort()
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim()
  } catch {
    return ""
  }
}

/** 部品と utils が使う外部パッケージのうち、アプリに無いもの。 */
function missingDeps(ui, appDir, draft) {
  const need = new Map()
  for (const pkgPath of ["utils/package.json", `${ui}/package.json`]) {
    for (const [name, version] of Object.entries(readJson(path.join(ROOT, pkgPath)).dependencies)) {
      if (DEMO_ONLY.has(name) || (!draft && DRAFT_ONLY.has(name))) continue
      need.set(name, { name, version, dev: false })
    }
  }
  // 型定義が別パッケージのもの (バージョンはルートの package.json に合わせる)
  const rootPkg = readJson(path.join(ROOT, "package.json"))
  for (const name of [...need.keys()]) {
    const version = rootPkg.devDependencies?.[`@types/${name}`]
    if (version) need.set(`@types/${name}`, { name: `@types/${name}`, version, dev: true })
  }
  let have = {}
  try {
    const app = readJson(path.join(appDir, "package.json"))
    have = { ...app.dependencies, ...app.devDependencies }
  } catch {
    // package.json が無ければ全部足りない扱い
  }
  return [...need.values()].filter((d) => !(d.name in have))
}

/** アプリに `@` → src の別名があるか (無ければ足し方を表示する。Nuxt は最初からある)。 */
function aliasHints(ui, appDir) {
  if (ui === "nuxt") return []
  const read = (f) => {
    try {
      return fs.readFileSync(path.join(appDir, f), "utf8")
    } catch {
      return ""
    }
  }
  const hints = []
  const vite = read("vite.config.ts") + read("vite.config.js")
  const ts = read("tsconfig.app.json") + read("tsconfig.json")
  if (!/["']@["']\s*:/.test(vite)) {
    hints.push(
      "vite.config.ts に別名を足す:",
      '  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },',
    )
  }
  if (!ts.includes('"@/*"')) {
    hints.push("tsconfig (compilerOptions) に paths を足す:", '  "paths": { "@/*": ["./src/*"] }')
  }
  return hints
}

/** 前回の取り込み記録と今のファイルを比べ、手を加えられたものを返す。 */
function changedSince(src, manifest) {
  const changed = []
  for (const [rel, hash] of Object.entries(manifest.files)) {
    const full = path.join(src, rel)
    if (!fs.existsSync(full)) changed.push(`削除  ${rel}`)
    else if (sha(fs.readFileSync(full)) !== hash) changed.push(`変更  ${rel}`)
  }
  return changed
}

function check(src) {
  const manifestPath = path.join(src, MANIFEST)
  if (!fs.existsSync(manifestPath)) throw new Error(`取り込み記録 (src/${MANIFEST}) が無い`)
  const manifest = readJson(manifestPath)
  const changed = changedSince(src, manifest)
  console.log(`取り込み元: ${manifest.source.commit} (${manifest.vendoredAt}, --ui ${manifest.ui})`)
  if (changed.length === 0) {
    console.log("手を加えられたファイルは無い")
    return 0
  }
  console.log("取り込み後に手を加えられたファイル (ライブラリ本体へ反映してから取り込み直す):")
  for (const c of changed) console.log(`  ${c}`)
  return 1
}

function vendor(opts, appDir, src) {
  const layout = LAYOUTS[opts.ui]
  if (!layout) throw new Error("--ui react または --ui nuxt を指定する")

  // 書き込む内容を先に全部作る (途中で失敗して半端に書かないように)
  const files = new Map()
  for (const [from, to] of layout) {
    const dir = path.join(ROOT, from)
    for (const rel of walk(dir)) {
      if (SKIP(rel) || (!opts.draft && isDraft(rel))) continue
      files.set(`${to}/${rel}`, fs.readFileSync(path.join(dir, rel)))
    }
  }

  const manifestPath = path.join(src, MANIFEST)
  const previous = fs.existsSync(manifestPath) ? readJson(manifestPath) : null
  if (previous) {
    const changed = changedSince(src, previous)
    if (changed.length) {
      for (const c of changed) console.log(`  ${c}`)
      throw new Error("取り込んだファイルが手で書き換えられている。消えてしまうので中止する")
    }
  }
  // アプリのファイルと同じ名前なら上書きしない
  const clash = [...files.keys()].filter(
    (rel) => fs.existsSync(path.join(src, rel)) && !(previous && rel in previous.files),
  )
  if (clash.length) {
    for (const rel of clash) console.log(`  ${path.basename(src)}/${rel}`)
    throw new Error("取り込み記録に無い同名のファイル (アプリのコード) があるので上書きしない")
  }

  const commit = git(["rev-parse", "--short", "HEAD"]) || "unknown"
  const sources = layout.map(([from]) => from.split("/")[0])
  const dirty = git(["status", "--porcelain", "--", ...new Set(sources)]) !== ""
  const now = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  const vendoredAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${now.toTimeString().slice(0, 8)}`
  const manifest = {
    source: { repo: "https://github.com/nak0376179/headless-components", commit, dirty },
    vendoredAt,
    ui: opts.ui,
    draft: opts.draft,
    files: Object.fromEntries([...files].map(([rel, buf]) => [rel, sha(buf)])),
  }
  const hooksDir = opts.ui === "nuxt" ? "composables" : "hooks"
  const example =
    opts.ui === "nuxt"
      ? [
          'import DataTable from "@/components/DataTable.vue"',
          'import { useCsvJson } from "@/composables/useCsvJson"   // 見た目を自作するとき',
        ]
      : [
          'import { DataTable } from "@/components/DataTable"',
          'import { useCsvJson } from "@/hooks/useCsvJson"   // 見た目を自作するとき',
        ]
  const readme = [
    "# utils (headless-components から取り込んだもの)",
    "",
    `[headless-components](${manifest.source.repo}) の utils と部品を取り込んだもの (commit \`${commit}\`${dirty ? "・未コミットの変更あり" : ""}、${vendoredAt.slice(0, 10)})。`,
    `取り込んだのは src/utils/・src/components/・src/${hooksDir}/ のうち \`.vendored.json\` に載っているファイル${opts.draft ? " (draft を含む)" : " (main だけ。draft は --draft)"}。`,
    "",
    "**取り込んだファイルは編集しない。** 直したいときはライブラリ本体を直して取り込み直す:",
    "",
    "```bash",
    `cd <headless-components> && pnpm vendor <このアプリ> --ui ${opts.ui}${opts.draft ? " --draft" : ""}`,
    "pnpm vendor <このアプリ> --check   # 手で書き換えていないかの確認",
    "```",
    "",
    "アプリ固有の見た目や既定値は、別のファイルで包み直す。",
    "",
    "```ts",
    'import { email, fetchAllPages, type ColumnSpec } from "@/utils"',
    ...example,
    "```",
    "",
  ].join("\n")

  const missing = missingDeps(opts.ui, appDir, opts.draft)
  const hints = aliasHints(opts.ui, appDir)
  console.log(
    `取り込み先: ${src}  (--ui ${opts.ui}${opts.draft ? " + draft" : ""}, ${files.size} ファイル, commit ${commit}${dirty ? " +未コミット" : ""})`,
  )
  if (opts.dryRun) {
    for (const rel of files.keys()) console.log(`  ${path.basename(src)}/${rel}`)
  } else {
    for (const rel of Object.keys(previous?.files ?? {})) {
      fs.rmSync(path.join(src, rel), { force: true }) // 前回の分 (今回無くなったものも消える)
    }
    for (const [rel, buf] of files) {
      const out = path.join(src, rel)
      fs.mkdirSync(path.dirname(out), { recursive: true })
      fs.writeFileSync(out, buf)
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
    fs.writeFileSync(path.join(src, README), readme)
    console.log("完了")
  }
  if (missing.length) {
    // バージョンを付けて入れる (付けないと最新のメジャー版が入り、型が合わないことがある)
    const spec = (list) => list.map((d) => `"${d.name}@${d.version}"`).join(" ")
    const prod = missing.filter((d) => !d.dev)
    const dev = missing.filter((d) => d.dev)
    console.log("\nアプリに足りない依存パッケージ (アプリのディレクトリで実行):")
    if (prod.length) console.log(`  pnpm add ${spec(prod)}`)
    if (dev.length) console.log(`  pnpm add -D ${spec(dev)}`)
  }
  if (hints.length) console.log(`\n${hints.join("\n")}`)
  if (dirty) console.log("\n注意: 未コミットの変更がある状態で取り込んだ")
  return 0
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help || !opts.app) {
    console.log(
      fs
        .readFileSync(fileURLToPath(import.meta.url), "utf8")
        .split("\n")
        .slice(1, 19)
        .join("\n"),
    )
    return opts.help ? 0 : 1
  }
  // pnpm vendor で呼ばれたときは、pnpm を実行した場所 (INIT_CWD) を基準にする
  const appDir = path.resolve(process.env.INIT_CWD ?? process.cwd(), opts.app)
  if (!fs.existsSync(appDir)) throw new Error(`アプリのディレクトリが無い: ${appDir}`)
  // Nuxt 4 の既定の srcDir は app/。src/ があればそちら
  const srcName = ["src", "app"].find((d) => fs.existsSync(path.join(appDir, d))) ?? "src"
  const src = path.join(appDir, srcName)
  return opts.check ? check(src) : vendor(opts, appDir, src)
}

try {
  process.exitCode = main()
} catch (e) {
  console.error(`エラー: ${e.message}`)
  process.exitCode = 1
}
