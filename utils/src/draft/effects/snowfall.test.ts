import { afterEach, describe, expect, it } from "vitest"
import { createSnowfall, depositSnow, relaxPile } from "./snowfall"

describe("depositSnow / relaxPile", () => {
  it("中心ほど厚く積もり、上限を超えない", () => {
    const pile = new Float32Array(40)
    depositSnow(pile, 20, 3, 3, 10)
    expect(pile[20]).toBeGreaterThan(pile[22])
    expect(pile[22]).toBeGreaterThan(pile[24])
    expect(pile[24]).toBe(0)
    for (let i = 0; i < 50; i++) depositSnow(pile, 20, 3, 3, 10)
    expect(Math.max(...pile)).toBeLessThanOrEqual(10)
  })
  it("端の柱は薄くしか積もらない", () => {
    const pile = new Float32Array(40)
    for (let i = 0; i < 50; i++) depositSnow(pile, 0, 3, 2, 10)
    expect(pile[0]).toBeLessThan(10 / 3)
  })
  it("満杯なら 0 を返す", () => {
    const pile = new Float32Array(10).fill(10)
    expect(depositSnow(pile, 5, 3, 2, 10)).toBe(0)
  })
  it("急な段差は隣へ流れてなだらかになる (総量は変わらない)", () => {
    const pile = new Float32Array([0, 0, 12, 0, 0])
    const sum = pile.reduce((a, b) => a + b, 0)
    relaxPile(pile, 20)
    expect(pile[2]).toBeLessThan(12)
    expect(pile[1]).toBeGreaterThan(0)
    expect(pile.reduce((a, b) => a + b, 0)).toBeCloseTo(sum, 4)
  })
})

describe("createSnowfall", () => {
  let root: HTMLElement
  afterEach(() => root?.remove())

  it("canvas を重ね、destroy でスタイルを戻す", () => {
    root = document.createElement("div")
    root.style.cssText = "color: red;"
    const canvas = document.createElement("canvas")
    root.append(canvas)
    document.body.append(root)
    const snow = createSnowfall({ root, canvas }, { intensity: 10 })
    expect(root.style.position).toBe("relative")
    expect(canvas.style.pointerEvents).toBe("none")
    snow.setWind(-30)
    snow.setIntensity(-5)
    expect(snow.get()).toMatchObject({ wind: -30, intensity: 0 })
    snow.destroy()
    expect(root.style.cssText).toBe("color: red;")
    expect(canvas.style.cssText).toBe("")
    snow.destroy() // 2 回呼んでも落ちない
  })
})
