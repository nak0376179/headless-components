#!/usr/bin/env node
// CSV/TSV → JSON 変換 (utils/src/csv-json) を、別のチームへ渡す `utils` フォルダとして書き出す。
// 受け取った側は、そのフォルダをアプリの src/utils/ に置いて papaparse を入れるだけで使える
// (React / Next.js / Vue / Nuxt を問わない。画面の部品は含めない)。
//
//   pnpm handoff              # handoff/csv-json/utils/ に書き出す
//   pnpm handoff --zip        # さらに handoff/csv-json-utils-<commit>.zip を作る
//   pnpm handoff --verify     # このリポジトリと無関係な空のプロジェクトに入れ、型検査とテストを流す (npm install するので通信する)
//   pnpm handoff --sync       # README のコード例 (<!-- file: … -->) を実ファイルの中身に合わせる
//   --out <dir>               # 書き出し先 (既定 handoff/csv-json)
//
// 中身: utils/{README.md, index.ts, store.ts, store.test.ts, csv-json/{README.md, SPEC.md, *.ts, *.test.ts}}
import { execFileSync, execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.join(ROOT, "utils/src")
const README = path.join(SRC, "csv-json/README.md")

const posix = (p) => p.split(path.sep).join("/")
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"))
const git = (args) => {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim()
  } catch {
    return ""
  }
}

/**
 * README の `<!-- file: <repo の相対パス> -->` … `<!-- /file -->` の間のコードブロックを、そのファイルの中身にする。
 * コード例はリポジトリの中で型検査されている実ファイルなので、ドキュメントが API とずれない。
 */
export function syncReadme(text) {
  return text.replace(
    /<!-- file: (\S+) -->\n```(\w+)\n[\s\S]*?```\n<!-- \/file -->/g,
    (_m, rel, lang) => {
      const code = fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\n+$/, "")
      return `<!-- file: ${rel} -->\n\`\`\`${lang}\n${code}\n\`\`\`\n<!-- /file -->`
    },
  )
}

/** 書き出すファイル (utils/ からの相対パス → 中身)。 */
export function collect() {
  const files = new Map()
  for (const rel of walk(path.join(SRC, "csv-json"))) {
    const full = path.join(SRC, "csv-json", rel)
    const text = fs.readFileSync(full, "utf8")
    files.set(`csv-json/${rel}`, rel === "README.md" ? syncReadme(text) : text)
  }
  for (const f of ["store.ts", "store.test.ts"]) {
    files.set(f, fs.readFileSync(path.join(SRC, f), "utf8"))
  }
  files.set(
    "index.ts",
    [
      "// utils — CSV/TSV → JSON 変換。使い方は csv-json/README.md、仕様は csv-json/SPEC.md。",
      'export { createStore } from "./store"',
      'export type { Listener, ReadableStore, Store } from "./store"',
      'export * from "./csv-json"',
      "",
    ].join("\n"),
  )
  return files
}

function walk(dir, base = dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(dir, e.name), base)
        : [posix(path.relative(base, path.join(dir, e.name)))],
    )
    .sort()
}

/** 受け取る側が入れる依存 (このリポジトリと同じ版)。 */
function deps() {
  const utils = readJson(path.join(ROOT, "utils/package.json")).dependencies
  const root = readJson(path.join(ROOT, "package.json")).devDependencies
  return {
    dependencies: { papaparse: utils.papaparse },
    devDependencies: {
      "@types/papaparse": root["@types/papaparse"],
      typescript: root.typescript,
      vitest: root.vitest,
    },
  }
}

function topReadme(commit, date, dirty) {
  const d = deps()
  return `# utils

CSV / TSV を列定義に従って検証し、JSON / CSV / TSV に変換するロジック。
**画面の部品は含まないので、React / Next.js / Vue / Nuxt のどれでもこのフォルダをそのまま使える。**

- 使い方 (導入・列定義・React / Vue での画面の作り方): [csv-json/README.md](csv-json/README.md)
- 挙動の仕様: [csv-json/SPEC.md](csv-json/SPEC.md)
- テスト: \`*.test.ts\` (Vitest)。本体 (\`csv-json/*.ts\`・\`store.ts\`) のカバレッジは文・分岐・関数・行とも 100%

## 導入

\`\`\`bash
# このフォルダをアプリの src/utils/ に置いてから
npm install papaparse@${d.dependencies.papaparse}
npm install -D @types/papaparse@${d.devDependencies["@types/papaparse"]}
# テストを流すなら
npm install -D vitest@${d.devDependencies.vitest} && npx vitest run src/utils
\`\`\`

\`\`\`ts
import { convertDelimitedText, createCsvJson, email, type ColumnSpec } from "@/utils"
\`\`\`

## 中身

| ファイル | 内容 |
| --- | --- |
| \`index.ts\` | ここから全部 import できる |
| \`csv-json/convert.ts\` | 検証と変換 (\`convertDelimitedText\`) |
| \`csv-json/validators.ts\` | よく使う検査 (\`email\` \`numeric\` \`zenkakuKatakana\` …) |
| \`csv-json/controller.ts\` | 入力画面の状態 (\`createCsvJson\`) |
| \`store.ts\` | \`createCsvJson\` が使う小さなストア |
| \`csv-json/readme.test.ts\` | README の「できること」の例 |
| \`csv-json/japanese.test.ts\` | 日本語の入力 (Excel のコピペ・全角/半角・BOM・サロゲートペア…) |
| \`csv-json/convert.test.ts\` | 仕様 (SPEC.md) の挙動 |
| \`csv-json/validators.test.ts\` / \`controller.test.ts\` / \`store.test.ts\` | 検査・入力画面の状態・ストア |

外部への依存は papaparse だけ。中のファイルどうしは相対パスで参照しているので、フォルダの名前や置き場所を変えても動く。

---
出所: headless-components (commit \`${commit}\`${dirty ? "・未コミットの変更あり" : ""}、${date})。
このフォルダの中を直すときは、元のリポジトリを直して書き出し直すと、次に渡すときに差分が出ない。
`
}

function write(files, out, commit, date, dirty) {
  const dir = path.join(out, "utils")
  fs.rmSync(out, { recursive: true, force: true })
  for (const [rel, text] of files) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), text)
  }
  fs.writeFileSync(path.join(dir, "README.md"), topReadme(commit, date, dirty))
  return dir
}

/** 空のプロジェクトに入れて、依存は papaparse だけで型検査とテストが通るか。 */
function verify(utilsDir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "csv-json-handoff-"))
  console.log(`検証: ${tmp}`)
  fs.cpSync(utilsDir, path.join(tmp, "src/utils"), { recursive: true })
  const d = deps()
  fs.writeFileSync(
    path.join(tmp, "package.json"),
    JSON.stringify({ name: "handoff-check", private: true, type: "module", ...d }, null, 2),
  )
  fs.writeFileSync(
    path.join(tmp, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          lib: ["ES2022", "DOM"],
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: [],
          paths: { "@/*": ["./src/*"] },
        },
        include: ["src"],
      },
      null,
      2,
    ),
  )
  // アプリからの使い方 (@/utils) で型が通るか
  fs.writeFileSync(
    path.join(tmp, "src/app.ts"),
    [
      'import { convertDelimitedText, createCsvJson, email, type ColumnSpec } from "@/utils"',
      'const columns: ColumnSpec[] = [{ label: "メール", key: "email", usage: "required", validate: email() }]',
      'const r = convertDelimitedText("メール\\na@example.com", columns)',
      "if (!r.ok) throw new Error(r.errors[0].message)",
      "createCsvJson({ columns }).convert()",
      "",
    ].join("\n"),
  )
  // npm / npx は Windows では .cmd なのでシェル経由で呼ぶ (引数は固定の文字列だけ)
  const run = (command) => execSync(command, { cwd: tmp, stdio: "inherit" })
  run("npm install --no-audit --no-fund --loglevel=error")
  run("npx tsc -p .")
  run("npx vitest run")
  fs.rmSync(tmp, { recursive: true, force: true })
  console.log("検証 OK: papaparse だけで型検査とテストが通った")
}

function main() {
  const argv = process.argv.slice(2)
  const has = (f) => argv.includes(f)
  const outArg = argv[argv.indexOf("--out") + 1]
  const out = path.resolve(
    process.env.INIT_CWD ?? process.cwd(),
    has("--out") ? outArg : path.join(ROOT, "handoff/csv-json"),
  )

  if (has("--sync")) {
    const before = fs.readFileSync(README, "utf8")
    const after = syncReadme(before)
    fs.writeFileSync(README, after)
    console.log(
      before === after
        ? "README は最新"
        : `README のコード例を更新した: ${posix(path.relative(ROOT, README))}`,
    )
    return 0
  }

  const commit = git(["rev-parse", "--short", "HEAD"]) || "unknown"
  const dirty =
    git(["status", "--porcelain", "--", "utils/src/csv-json", "utils/src/store.ts"]) !== ""
  const date = new Date().toISOString().slice(0, 10)
  const files = collect()
  const dir = write(files, out, commit, date, dirty)
  console.log(
    `書き出し: ${dir} (${files.size + 1} ファイル, commit ${commit}${dirty ? " +未コミット" : ""})`,
  )

  if (has("--zip")) {
    const zip = path.join(path.dirname(out), `csv-json-utils-${commit}.zip`)
    // 前に作った zip (別の commit のもの) は消す。どれが最新か迷わないように
    for (const f of fs.readdirSync(path.dirname(out))) {
      if (/^csv-json-utils-.+\.zip$/.test(f)) fs.rmSync(path.join(path.dirname(out), f))
    }
    // Windows 10 以降と macOS の tar (bsdtar) は -a で拡張子から zip を作れる。
    // Windows では Git Bash の GNU tar (zip を作れず、C: をホスト名と読む) を避けて System32 のものを使う。
    const tar =
      process.platform === "win32"
        ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")
        : "tar"
    execFileSync(tar, ["-a", "-c", "-f", path.basename(zip), "-C", path.basename(out), "utils"], {
      cwd: path.dirname(out),
    })
    console.log(`zip: ${zip}`)
  }
  if (has("--verify")) verify(dir)
  if (dirty) console.log("注意: 未コミットの変更がある状態で書き出した")
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main()
  } catch (e) {
    console.error(`エラー: ${e.message}`)
    process.exitCode = 1
  }
}
