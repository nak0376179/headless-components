// フレームワーク非依存の最小ストア。コアのコントローラは状態をこれで公開し、
// React は useSyncExternalStore、Vue は shallowRef で購読する (react/src/hooks・nuxt/src/composables の useStore)。
// スナップショットは不変オブジェクトとして扱い、変更のたびに新しいオブジェクトに置き換える。

export type Listener = () => void

/** 読み取り専用のストア。UI 側はこの 2 つだけに依存する。 */
export interface ReadableStore<T> {
  /** 現在のスナップショット。変更がなければ同じ参照を返す。 */
  get(): T
  /** 変更通知を購読する。戻り値で購読を解除する。 */
  subscribe(listener: Listener): () => void
}

export interface Store<T> extends ReadableStore<T> {
  set(next: T | ((prev: T) => T)): void
  /** 一部のプロパティだけ差し替える (浅いマージ)。 */
  patch(partial: Partial<T>): void
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<Listener>()
  const set = (next: T | ((prev: T) => T)) => {
    const value = typeof next === "function" ? (next as (prev: T) => T)(state) : next
    if (Object.is(value, state)) return
    state = value
    for (const l of [...listeners]) l()
  }
  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set,
    patch: (partial) => set((prev) => ({ ...prev, ...partial })),
  }
}
