import { getCurrentScope, onScopeDispose } from "vue"
import { createInfiniteList, type InfiniteListOptions } from "@/utils/draft"
import { useAppQueryClient } from "@/composables/draft/useAppQueryClient"
import { useStore } from "@/composables/useStore"

/** 無限スクロールの読み込み (TanStack Query)。スコープが終わると検索のタイマーを止める。 */
export function useInfiniteList<T>(options: InfiniteListOptions<T>) {
  const controller = createInfiniteList({ ...options, queryClient: useAppQueryClient(options) })
  if (getCurrentScope()) onScopeDispose(() => controller.destroy())
  const state = useStore(controller)
  return { state, controller }
}
