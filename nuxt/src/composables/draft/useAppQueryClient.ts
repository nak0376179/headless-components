import { inject } from "vue"
import { VUE_QUERY_CLIENT, type QueryClient } from "@tanstack/vue-query"
import type { CursorQueryOptions } from "@/utils/draft"

/**
 * TanStack Query の QueryClient を、アプリに入れた VueQueryPlugin から取って core に渡す (setup の中で呼ぶ)。
 * プラグインが無ければ undefined (core 内の共有のものが使われる)。options.queryClient を渡せばそれが優先。
 */
export function useAppQueryClient(options: CursorQueryOptions) {
  return options.queryClient ?? inject<QueryClient | undefined>(VUE_QUERY_CLIENT, undefined)
}
