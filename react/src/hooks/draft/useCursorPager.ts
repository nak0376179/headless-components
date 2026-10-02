import { useEffect } from "react"
import { createCursorPager, type CursorPagerOptions } from "@/utils/draft"
import { useAppQueryClient } from "@/hooks/draft/useAppQueryClient"
import { useController, useStore } from "@/hooks/useStore"

/** カーソル方式のサーバーページネーション (TanStack Query)。 */
export function useCursorPager<T>(options: CursorPagerOptions<T>) {
  const queryClient = useAppQueryClient(options)
  const controller = useController(() => createCursorPager({ ...options, queryClient }))
  useEffect(() => () => controller.destroy(), [controller])
  const state = useStore(controller)
  return { state, controller }
}
