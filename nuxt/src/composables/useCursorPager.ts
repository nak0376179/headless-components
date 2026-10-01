import { getCurrentScope, onScopeDispose } from "vue"
import { createCursorPager, type CursorPagerOptions } from "@core"
import { useAppQueryClient } from "@/composables/useAppQueryClient"
import { useStore } from "@/composables/useStore"

/** カーソル方式のサーバーページネーション (TanStack Query)。 */
export function useCursorPager<T>(options: CursorPagerOptions<T>) {
  const controller = createCursorPager({ ...options, queryClient: useAppQueryClient(options) })
  if (getCurrentScope()) onScopeDispose(() => controller.destroy())
  const state = useStore(controller)
  return { state, controller }
}
