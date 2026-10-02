#!/usr/bin/env node
// CSV/TSV (utils/src/csv-json と store) のテストを流し、結果とカバレッジを
// demo-data/src/generated/csv-report.json に書く。デモの「テスト結果」のページがこれを表示する。
//
//   pnpm csv:report
//
// pnpm deploy:demos は公開の前に必ずこれを流す (公開したデモのテスト結果は、その時点のもの)。
import { execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "demo-data/src/generated/csv-report.json")
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "csv-report-"))
const posix = (p) => p.split(path.sep).join("/")
const rel = (p) => posix(path.relative(path.join(ROOT, "utils/src"), p))

const git = (args) => {
  try {
    return execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" }).trim()
  } catch {
    return ""
  }
}

let failed = false
try {
  execSync(
    [
      "pnpm exec vitest run --project utils utils/src/csv-json utils/src/store.test.ts",
      `--reporter=json --outputFile.json=${JSON.stringify(path.join(tmp, "tests.json"))}`,
      "--coverage --coverage.reporter=json-summary",
      `--coverage.reportsDirectory=${JSON.stringify(path.join(tmp, "coverage"))}`,
    ].join(" "),
    { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] },
  )
} catch {
  failed = true // 失敗したテストも、結果としてそのまま書き出す
}

const tests = JSON.parse(fs.readFileSync(path.join(tmp, "tests.json"), "utf8"))
const coverage = JSON.parse(
  fs.readFileSync(path.join(tmp, "coverage/coverage-summary.json"), "utf8"),
)
const pick = (c) =>
  Object.fromEntries(
    ["statements", "branches", "functions", "lines"].map((k) => [
      k,
      { covered: c[k].covered, total: c[k].total, pct: c[k].pct },
    ]),
  )

const report = {
  generatedAt: new Date().toISOString(),
  commit: git("rev-parse --short HEAD"),
  dirty: git("status --porcelain -- utils/src") !== "",
  totals: {
    files: tests.testResults.length,
    tests: tests.numTotalTests,
    passed: tests.numPassedTests,
    failed: tests.numFailedTests,
    durationMs: Math.round(
      tests.testResults.reduce((sum, f) => sum + (f.endTime - f.startTime), 0),
    ),
  },
  coverage: {
    total: pick(coverage.total),
    files: Object.entries(coverage)
      .filter(([k]) => k !== "total")
      .map(([file, c]) => ({ file: rel(file), ...pick(c) }))
      .sort((a, b) => a.file.localeCompare(b.file)),
  },
  files: tests.testResults
    .map((f) => ({
      file: rel(f.name),
      tests: f.assertionResults.map((t) => ({
        group: t.ancestorTitles.join(" › "),
        title: t.title,
        status: t.status,
        durationMs: Math.round(t.duration ?? 0),
        failure: t.failureMessages?.[0]?.split("\n")[0] ?? null,
      })),
    }))
    .sort((a, b) => a.file.localeCompare(b.file)),
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n")
fs.rmSync(tmp, { recursive: true, force: true })
console.log(
  `テスト ${report.totals.passed}/${report.totals.tests} 件成功・カバレッジ (行) ${report.coverage.total.lines.pct}% → ${posix(path.relative(ROOT, OUT))}`,
)
if (failed) process.exitCode = 1
