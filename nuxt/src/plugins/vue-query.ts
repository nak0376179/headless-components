// TanStack Query (サーバーページネーション・無限スクロールの取得とキャッシュ)。
// core の部品も useAppQueryClient でこれを使う。QueryClient はリクエストごとに作る (SSR で利用者間に漏らさない)。
// サーバーでは取りに行かない (core が isServer で止める) ので、dehydrate / hydrate はしていない。
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query"

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  })
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
})
