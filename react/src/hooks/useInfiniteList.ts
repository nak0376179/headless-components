import { useEffect } from "react"
import { createInfiniteList, type InfiniteListOptions } from "@core"
import { useController, useStore } from "@/hooks/useStore"

/** 無限スクロールの読み込み。アンマウントで検索のタイマーを止める。 */
export function useInfiniteList<T>(options: InfiniteListOptions<T>) {
  const controller = useController(() => createInfiniteList(options))
  useEffect(() => () => controller.destroy(), [controller])
  const state = useStore(controller)
  return { state, controller }
}
