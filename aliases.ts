// 共有ソースへの別名。React (vite.config.ts) と Nuxt (nuxt.config.ts) と vitest が同じものを使う。
// TypeScript 側の paths は tsconfig.base.json / react/tsconfig.json に同じ対応を書いてある。
//
// core はコピーせず 1 か所に置き、各アプリからは `@core` (= core/src) で参照する。
// 別のアプリへ取り込むときは src/core/ にコピーして `@core` → src/core の別名を張るので、import 文は同じになる。
import { fileURLToPath } from "node:url"

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export const aliases = {
  "@core": here("./core/src"),
  "@demo-data": here("./demo-data/src"),
}
