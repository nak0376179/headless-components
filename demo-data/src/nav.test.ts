import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { NAV, resolveNav } from "./nav"

const repo = (p: string) => resolve(import.meta.dirname, "../..", p)

describe("NAV", () => {
  // 片方にだけページを足すと、もう片方の版で「同じページを開く」が 404 になる。
  it.each(NAV.flatMap((t) => t.pages.map((p) => `${t.slug}/${p.slug}`)))(
    "%s は React 版と Nuxt 版の両方にページがある",
    (path) => {
      expect(existsSync(repo(`react/src/pages/${path}.tsx`))).toBe(true)
      expect(existsSync(repo(`nuxt/src/pages/${path}.vue`))).toBe(true)
    },
  )
})

describe("resolveNav", () => {
  it("パスはそのページ、タブだけなら先頭、知らないものは既定", () => {
    expect(resolveNav("/table/infinite").path).toBe("/table/infinite")
    expect(resolveNav("/table").path).toBe("/table/table-basics")
    expect(resolveNav("/table/nope").path).toBe("/table/table-basics")
    expect(resolveNav("/").path).toBe("/csv-json/convert")
    expect(resolveNav("/nope/x").path).toBe("/csv-json/convert")
  })
  it("旧版の #slug (ページ名だけ・古い名前) も開ける", () => {
    expect(resolveNav("#infinite").path).toBe("/table/infinite")
    expect(resolveNav("#csv-json").path).toBe("/csv-json/convert")
    expect(resolveNav("#effects").path).toBe("/effects/jigsaw")
  })
})
