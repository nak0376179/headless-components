// core のストア (ReadableStore) を Vue から購読する土台。他の composable はこれの上に乗る。
// 見た目は持たない (Vuetify で包んだものは components/)。
import {
  getCurrentScope,
  isRef,
  onScopeDispose,
  shallowRef,
  watch,
  type Ref,
  type ShallowRef,
} from "vue"
import type { ReadableStore } from "@core"

/**
 * ストアを購読して shallowRef で返す。ref を渡せば差し替えにも追従する (null の間は undefined)。
 * スコープ (setup / effectScope) が破棄されると購読も外れる。
 */
export function useStore<T>(store: ReadableStore<T>): Readonly<ShallowRef<T>>
export function useStore<T>(
  store: Ref<ReadableStore<T> | null | undefined>,
): Readonly<ShallowRef<T | undefined>>
export function useStore<T>(
  store: ReadableStore<T> | Ref<ReadableStore<T> | null | undefined>,
): Readonly<ShallowRef<T | undefined>> {
  const current = () => (isRef(store) ? store.value : store)
  const snapshot = shallowRef<T | undefined>(current()?.get())
  let unsubscribe: (() => void) | undefined
  const attach = (s: ReadableStore<T> | null | undefined) => {
    unsubscribe?.()
    unsubscribe = undefined
    snapshot.value = s?.get()
    if (s) unsubscribe = s.subscribe(() => (snapshot.value = s.get()))
  }
  if (isRef(store)) watch(store, attach, { immediate: true })
  else attach(store)
  if (getCurrentScope()) onScopeDispose(() => unsubscribe?.())
  return snapshot
}
