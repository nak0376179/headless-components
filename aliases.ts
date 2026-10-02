// 共有ソースへの別名。React (vite.config.ts) と Nuxt (nuxt.config.ts) と vitest が同じものを使う。
// TypeScript 側の paths は tsconfig.base.json / react/tsconfig.json に同じ対応を書いてある。
//
// utils はコピーせず 1 か所 (このリポジトリの utils/src) に置き、各アプリからは `@/utils` で参照する。
// 別のアプリへ取り込むときは src/utils/ にコピーするので、`@` → src の別名だけで同じ import 文が通る。
// ⚠ `@/utils` は `@` より先に書く (前から順に当てはめるので、`@` が先だと src/utils を探しに行く)。
import { fileURLToPath } from "node:url"

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export const aliases = {
  "@/utils": here("./utils/src"),
  "@demo-data": here("./demo-data/src"),
}
