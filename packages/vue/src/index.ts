// @hc/vue — @hc/core のコントローラを Vue 3 から使うための薄い composable 集。
// 見た目は持たない (Vuetify で包んだものは @hc/vuetify)。
import {
  getCurrentScope,
  isRef,
  onMounted,
  onBeforeUnmount,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
  type ShallowRef,
  type WatchSource,
} from "vue"
import {
  createCsvJson,
  createCursorPager,
  createDataTable,
  createForm,
  createInfiniteList,
  type ColumnSpec,
  type CsvJsonOptions,
  type CursorPagerOptions,
  type DataTableColumn,
  type DataTableOptions,
  type FormOptions,
  type InfiniteListOptions,
  type ReadableStore,
} from "@hc/core"

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

// ---------------------------------------------------------------- csv-json

export interface UseCsvJsonOptions extends Omit<CsvJsonOptions, "columns"> {
  columns: MaybeRefOrGetter<ColumnSpec[]>
}

export function useCsvJson(options: UseCsvJsonOptions) {
  const controller = createCsvJson({ ...options, columns: toValue(options.columns) })
  watch(
    () => toValue(options.columns),
    (columns) => controller.setColumns(columns),
  )
  const state = useStore(controller)
  return { state, controller }
}

// ---------------------------------------------------------------- form

/** フォームの状態と操作。state は shallowRef (テンプレートでは state.values.name のように読める)。 */
export function useForm<T extends object>(options: FormOptions<T>) {
  const controller = createForm<T>(options)
  const state = useStore(controller)
  return { state, controller }
}

// ---------------------------------------------------------------- data-table

export interface UseDataTableOptions<T> extends Omit<DataTableOptions<T>, "data" | "columns"> {
  data: MaybeRefOrGetter<T[]>
  columns: MaybeRefOrGetter<DataTableColumn<T>[]>
}

export function useDataTable<T>(options: UseDataTableOptions<T>) {
  const controller = createDataTable({
    ...options,
    data: toValue(options.data),
    columns: toValue(options.columns),
  })
  watch(
    () => toValue(options.data),
    (data) => controller.setData(data),
  )
  watch(
    () => toValue(options.columns),
    (columns) => controller.setColumns(columns),
  )
  const state = useStore(controller)
  return { table: controller.table, state, controller }
}

/** 無限スクロールの読み込み。スコープが終わると検索のタイマーを止める。 */
export function useInfiniteList<T>(options: InfiniteListOptions<T>) {
  const controller = createInfiniteList(options)
  if (getCurrentScope()) onScopeDispose(() => controller.destroy())
  const state = useStore(controller)
  return { state, controller }
}

export function useCursorPager<T>(options: CursorPagerOptions<T>) {
  const controller = createCursorPager(options)
  const state = useStore(controller)
  return { state, controller }
}

// ---------------------------------------------------------------- DOM を触るコントローラ (演出系)

export interface Destroyable {
  destroy(): void
}

/**
 * DOM 要素に取り付けるコントローラ (演出系など) を、マウント後に作ってアンマウントで破棄する。
 * mount が null を返したら (要素がまだ無いなど) 何もしない。deps が変われば作りなおす。
 */
export function useMounted<C extends Destroyable>(
  mount: () => C | null,
  deps: WatchSource[] = [],
): Readonly<ShallowRef<C | null>> {
  // shallowRef<C> は C を展開した型になって戻り値と合わないので、明示的に ShallowRef<C | null> にする。
  const controller = shallowRef(null) as ShallowRef<C | null>
  const remount = () => {
    controller.value?.destroy()
    controller.value = mount()
  }
  onMounted(() => {
    remount()
    if (deps.length) watch(deps, remount)
  })
  onBeforeUnmount(() => {
    controller.value?.destroy()
    controller.value = null
  })
  return controller
}
