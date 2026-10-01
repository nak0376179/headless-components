import { createCursorPager, type CursorPagerOptions } from "@core"
import { useStore } from "@/composables/useStore"

/** カーソル方式のサーバーページネーション。 */
export function useCursorPager<T>(options: CursorPagerOptions<T>) {
  const controller = createCursorPager(options)
  const state = useStore(controller)
  return { state, controller }
}
