#!/usr/bin/env node
// このライブラリをアプリの src/libs/<name>/ に丸ごと取り込む (vendoring)。
//
//   pnpm vendor <アプリのディレクトリ> --ui mui          # React + MUI のアプリ
//   pnpm vendor <アプリのディレクトリ> --ui vuetify      # Vue + Vuetify のアプリ
//   pnpm vendor <アプリのディレクトリ> --check           # 取り込んだ後に手で書き換えられていないか
//
//   --name ui-kit      取り込み先のフォルダ名 (既定 ui-kit → src/libs/ui-kit/)
//   --dest src/libs    取り込み先の親 (アプリのディレクトリからの相対)
//   --dry-run          書き込まずに何をするかだけ表示
//
// 取り込み先の構成は packages/ と同じ (core / react / mui または core / vue / vuetify)。
// 中の `@hc/*` の import は相対パスに書き換えるので、アプリ側に別名の設定は要らない。
// アプリからは `@/libs/ui-kit/mui` のように使う。
// **取り込んだ中身は編集しない** (直すならこのリポジトリを直して取り込み直す)。
// 取り込み直しは前回の分を消して入れ替える。前回の取り込み記録 (.vendored.json) が無い
// フォルダは、アプリのコードの可能性があるので上書きしない。
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MANIFEST = ".vendored.json"
const UI_LAYERS = { mui: ["core", "react", "mui"], vuetify: ["core", "vue", "vuetify"] }
const SKIP = (rel) => /\.test\.[tj]sx?$/.test(rel) || rel === "env.d.ts"

function parseArgs(argv) {
  const opts = {
    name: "ui-kit",
    dest: "src/libs",
    ui: null,
    check: false,
    dryRun: false,
    app: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--ui") opts.ui = argv[++i]
    else if (a === "--name") opts.name = argv[++i]
    else if (a === "--dest") opts.dest = argv[++i]
    else if (a === "--check") opts.check = true
    else if (a === "--dry-run") opts.dryRun = true
    else if (a === "-h" || a === "--help") opts.help = true
    else if (!a.startsWith("-") && !opts.app) opts.app = a
    else throw new Error(`不明な引数: ${a}`)
  }
  return opts
}

const sha = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16)
const posix = (p) => p.split(path.sep).join("/")

function walk(dir, base = dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full, base))
    else out.push(posix(path.relative(base, full)))
  }
  return out.sort()
}

/** `@hc/<layer>` をファイル位置からの相対パスに書き換える。 */
function rewriteImports(text, fileRelInTarget, layers) {
  return text.replace(/(["'])@hc\/([a-z-]+)\1/g, (m, q, pkg) => {
    if (!layers.includes(pkg)) {
      throw new Error(`${fileRelInTarget}: 取り込まない層 @hc/${pkg} を参照している`)
    }
    let rel = posix(path.relative(path.dirname(fileRelInTarget), pkg))
    if (!rel.startsWith(".")) rel = `./${rel}`
    return `${q}${rel}${q}`
  })
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim()
  } catch {
    return ""
  }
}

/** 取り込む層が使う外部パッケージ (@hc/* を除く) と、アプリに無いもの。 */
function missingDeps(layers, appDir) {
  const need = new Map()
  for (const layer of layers) {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "packages", layer, "package.json"), "utf8"),
    )
    for (const [name, version] of Object.entries({
      ...pkg.dependencies,
      ...pkg.peerDependencies,
    })) {
      if (!name.startsWith("@hc/")) need.set(name, { name, version, dev: false })
    }
  }
  // 型定義が別パッケージのもの (バージョンはルートの package.json に合わせる)
  const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))
  for (const name of [...need.keys()]) {
    const types = `@types/${name}`
    const version = rootPkg.devDependencies?.[types]
    if (version) need.set(types, { name: types, version, dev: true })
  }
  let have = {}
  try {
    const app = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf8"))
    have = { ...app.dependencies, ...app.devDependencies }
  } catch {
    // package.json が無ければ全部足りない扱い
  }
  return [...need.values()].filter((d) => !(d.name in have))
}

function check(target) {
  const manifestPath = path.join(target, MANIFEST)
  if (!fs.existsSync(manifestPath)) throw new Error(`${target} に取り込み記録 (${MANIFEST}) が無い`)
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  const now = new Set(walk(target).filter((f) => f !== MANIFEST && f !== "VENDORED.md"))
  const changed = []
  for (const [rel, hash] of Object.entries(manifest.files)) {
    if (!now.has(rel)) changed.push(`削除  ${rel}`)
    else if (sha(fs.readFileSync(path.join(target, rel))) !== hash) changed.push(`変更  ${rel}`)
    now.delete(rel)
  }
  for (const rel of now) changed.push(`追加  ${rel}`)
  console.log(`取り込み元: ${manifest.source.commit} (${manifest.vendoredAt})`)
  if (changed.length === 0) {
    console.log("手を加えられたファイルは無い")
    return 0
  }
  console.log("取り込み後に手を加えられたファイル (ライブラリ本体へ反映してから取り込み直す):")
  for (const c of changed) console.log(`  ${c}`)
  return 1
}

function vendor(opts, appDir, target) {
  const layers = UI_LAYERS[opts.ui]
  if (!layers) throw new Error("--ui mui または --ui vuetify を指定する")

  if (fs.existsSync(target)) {
    if (!fs.existsSync(path.join(target, MANIFEST))) {
      throw new Error(
        `${target} は既にあり、取り込み記録 (${MANIFEST}) が無い。アプリのコードかもしれないので上書きしない`,
      )
    }
    if (check(target) !== 0) {
      throw new Error("取り込んだ中身が手で書き換えられている。消えてしまうので中止する")
    }
  }

  // 書き込む内容を先に全部作る (途中で失敗して半端に書かないように)
  const files = new Map()
  for (const layer of layers) {
    const src = path.join(ROOT, "packages", layer, "src")
    for (const rel of walk(src)) {
      if (SKIP(rel)) continue
      const relInTarget = `${layer}/${rel}`
      let buf = fs.readFileSync(path.join(src, rel))
      if (/\.(ts|tsx|vue)$/.test(rel)) {
        buf = Buffer.from(rewriteImports(buf.toString("utf8"), relInTarget, layers), "utf8")
      }
      files.set(relInTarget, buf)
    }
  }

  const commit = git(["rev-parse", "--short", "HEAD"]) || "unknown"
  const dirty = git(["status", "--porcelain", "--", "packages"]) !== ""
  const now = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  const vendoredAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${now.toTimeString().slice(0, 8)}`
  const manifest = {
    source: { repo: "https://github.com/nak0376179/headless-components", commit, dirty },
    vendoredAt,
    ui: opts.ui,
    layers,
    files: Object.fromEntries([...files].map(([rel, buf]) => [rel, sha(buf)])),
  }
  const importBase = posix(path.join(opts.dest.replace(/^src\/?/, "@/"), opts.name))
  const readme = [
    `# ${opts.name}`,
    "",
    `[headless-components](${manifest.source.repo}) を取り込んだもの (commit \`${commit}\`${dirty ? "・未コミットの変更あり" : ""}、${vendoredAt.slice(0, 10)})。`,
    "",
    "**このフォルダの中は編集しない。** 直したいときはライブラリ本体を直して取り込み直す:",
    "",
    "```bash",
    `cd <headless-components> && pnpm vendor <このアプリ> --ui ${opts.ui} --name ${opts.name}`,
    `pnpm vendor <このアプリ> --name ${opts.name} --check   # 手で書き換えていないかの確認`,
    "```",
    "",
    "アプリ固有の見た目や既定値は、このフォルダの外 (src/components/ など) で包み直す。",
    "",
    "```ts",
    `import { DataTable, CsvJsonTextArea } from "${importBase}/${layers[2]}"`,
    `import { email, type ColumnSpec } from "${importBase}/core"`,
    `import { useCsvJson } from "${importBase}/${layers[1]}"   // 見た目を自作するとき`,
    "```",
    "",
  ].join("\n")

  const missing = missingDeps(layers, appDir)
  console.log(
    `取り込み先: ${target}  (${layers.join(" / ")}, ${files.size} ファイル, commit ${commit}${dirty ? " +未コミット" : ""})`,
  )
  if (opts.dryRun) {
    for (const rel of files.keys()) console.log(`  ${rel}`)
  } else {
    fs.rmSync(target, { recursive: true, force: true })
    for (const [rel, buf] of files) {
      const out = path.join(target, rel)
      fs.mkdirSync(path.dirname(out), { recursive: true })
      fs.writeFileSync(out, buf)
    }
    fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify(manifest, null, 2) + "\n")
    fs.writeFileSync(path.join(target, "VENDORED.md"), readme)
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
  console.log(`\n使い方: import { DataTable } from "${importBase}/${layers[2]}"`)
  if (dirty) console.log("注意: packages/ に未コミットの変更がある状態で取り込んだ")
  return 0
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help || !opts.app) {
    console.log(
      fs
        .readFileSync(fileURLToPath(import.meta.url), "utf8")
        .split("\n")
        .slice(1, 17)
        .join("\n"),
    )
    return opts.help ? 0 : 1
  }
  // pnpm vendor で呼ばれたときは、pnpm を実行した場所 (INIT_CWD) を基準にする
  const appDir = path.resolve(process.env.INIT_CWD ?? process.cwd(), opts.app)
  if (!fs.existsSync(appDir)) throw new Error(`アプリのディレクトリが無い: ${appDir}`)
  const target = path.join(appDir, opts.dest, opts.name)
  return opts.check ? check(target) : vendor(opts, appDir, target)
}

try {
  process.exitCode = main()
} catch (e) {
  console.error(`エラー: ${e.message}`)
  process.exitCode = 1
}
