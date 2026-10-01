import { createCursorPager, type CursorPagerOptions } from "@core"
import { useController, useStore } from "@/hooks/useStore"

/** カーソル方式のサーバーページネーション。 */
export function useCursorPager<T>(options: CursorPagerOptions<T>) {
  const controller = useController(() => createCursorPager(options))
  const state = useStore(controller)
  return { state, controller }
}
