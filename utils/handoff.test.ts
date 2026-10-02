// CSV/TSV を別チームへ渡す形 (pnpm handoff → utils/ フォルダ) が成り立っているかの検査。
// このファイル自体は渡さない (utils/src の外に置いている)。
import { readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"
// @ts-expect-error -- 型定義の無い .mjs (書き出しスクリプト) をそのまま読む
import { collect, syncReadme } from "../scripts/handoff.mjs"

const csvDir = resolve(import.meta.dirname, "src/csv-json")
const sources = readdirSync(csvDir).filter((f) => f.endsWith(".ts"))

describe("CSV/TSV の書き出し (pnpm handoff)", () => {
  // フォルダを配るだけで動くよう、外への依存は papaparse (とテストの vitest) と store.ts だけにする
  it.each(sources)("csv-json/%s は papaparse・store・同じフォルダ以外を import しない", (file) => {
    const text = readFileSync(join(csvDir, file), "utf8")
    const specs = [...text.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1])
    for (const spec of specs) {
      expect(["papaparse", "vitest", "../store"].includes(spec) || spec.startsWith("./")).toBe(true)
    }
  })

  it("README のコード例は実ファイルの中身と同じ (ずれていたら pnpm handoff --sync)", () => {
    const readme = readFileSync(join(csvDir, "README.md"), "utf8")
    expect(syncReadme(readme)).toBe(readme)
  })

  it("書き出す中身は README・仕様・本体・テスト・store・index", () => {
    const files = [...(collect() as Map<string, string>).keys()]
    expect(files).toEqual(
      expect.arrayContaining([
        "index.ts",
        "store.ts",
        "csv-json/README.md",
        "csv-json/SPEC.md",
        "csv-json/convert.ts",
        "csv-json/convert.test.ts",
      ]),
    )
    // data-table や draft は入らない
    expect(files.some((f) => /data-table|draft/.test(f))).toBe(false)
  })
})
