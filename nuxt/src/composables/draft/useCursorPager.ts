import { getCurrentScope, onScopeDispose } from "vue"
import { createCursorPager, type CursorPagerOptions } from "@/utils/draft"
import { useAppQueryClient } from "@/composables/draft/useAppQueryClient"
import { useStore } from "@/composables/useStore"

/** カーソル方式のサーバーページネーション (TanStack Query)。 */
export function useCursorPager<T>(options: CursorPagerOptions<T>) {
  const controller = createCursorPager({ ...options, queryClient: useAppQueryClient(options) })
  if (getCurrentScope()) onScopeDispose(() => controller.destroy())
  const state = useStore(controller)
  return { state, controller }
}
