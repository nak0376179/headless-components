import { useContext } from "react"
import { QueryClientContext } from "@tanstack/react-query"
import type { CursorQueryOptions } from "@/utils/draft"

/**
 * TanStack Query の QueryClient を、アプリの QueryClientProvider から取って core に渡す。
 * Provider が無ければ undefined (core 内の共有のものが使われる)。options.queryClient を渡せばそれが優先。
 */
export function useAppQueryClient(options: CursorQueryOptions) {
  const appClient = useContext(QueryClientContext)
  return options.queryClient ?? appClient
}
