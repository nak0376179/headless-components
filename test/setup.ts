// 全パッケージ共通の vitest セットアップ (jsdom に無い API の最小スタブ)。
// jest-dom のカスタムマッチャ（toBeInTheDocument など）を vitest の expect に追加する。
import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

// Vuetify は matchMedia / ResizeObserver を使うが jsdom には無いので最小限のスタブを入れる。
if (!globalThis.matchMedia) {
  globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof globalThis.matchMedia
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// Vuetify の一部コンポーネントが参照する visualViewport を補う。
if (!globalThis.visualViewport) {
  globalThis.visualViewport = {
    width: 1024,
    height: 768,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as typeof globalThis.visualViewport
}
