// utils のストア (ReadableStore) を React から購読する土台。他のフックはこれの上に乗る。
// 見た目は持たない (MUI で包んだものは components/)。
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import type { ReadableStore } from "@/utils"

const noopSubscribe = () => () => {}

/** ストアを購読して現在のスナップショットを返す。null を渡すと undefined。 */
export function useStore<T>(store: ReadableStore<T>): T
export function useStore<T>(store: ReadableStore<T> | null | undefined): T | undefined
export function useStore<T>(store: ReadableStore<T> | null | undefined): T | undefined {
  return useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    () => store?.get(),
    () => store?.get(),
  )
}

/** コンポーネントの寿命のあいだ 1 度だけ作るコントローラ。 */
export function useController<C>(factory: () => C): C {
  const [controller] = useState(factory)
  return controller
}

/** 最新の値を ref で持つ (コールバックを deps に入れずに最新版を呼ぶため)。 */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
