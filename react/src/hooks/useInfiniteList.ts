import { useEffect } from "react"
import { createInfiniteList, type InfiniteListOptions } from "@core"
import { useAppQueryClient } from "@/hooks/useAppQueryClient"
import { useController, useStore } from "@/hooks/useStore"

/** 無限スクロールの読み込み (TanStack Query)。アンマウントで検索のタイマーを止める。 */
export function useInfiniteList<T>(options: InfiniteListOptions<T>) {
  const queryClient = useAppQueryClient(options)
  const controller = useController(() => createInfiniteList({ ...options, queryClient }))
  useEffect(() => () => controller.destroy(), [controller])
  const state = useStore(controller)
  return { state, controller }
}
