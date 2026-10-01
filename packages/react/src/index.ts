// @hc/react — @hc/core のコントローラを React から使うための薄いフック集。
// 見た目は持たない (MUI で包んだものは @hc/mui)。
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type DependencyList,
} from "react"
import {
  createCsvJson,
  createCursorPager,
  createDataTable,
  createForm,
  createInfiniteList,
  type CsvJsonOptions,
  type CursorPagerOptions,
  type DataTableOptions,
  type FormOptions,
  type InfiniteListOptions,
  type ReadableStore,
} from "@hc/core"

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
function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

// ---------------------------------------------------------------- csv-json

export function useCsvJson(options: CsvJsonOptions) {
  const onConvert = useLatest(options.onConvert)
  const controller = useController(() =>
    createCsvJson({ ...options, onConvert: (r) => onConvert.current?.(r) }),
  )
  useEffect(() => controller.setColumns(options.columns), [controller, options.columns])
  const state = useStore(controller)
  return { state, controller }
}

// ---------------------------------------------------------------- form

/** フォームの状態と操作。onSubmit は最新の関数を呼ぶ (描画のたびに作り直してよい)。 */
export function useForm<T extends object>(options: FormOptions<T>) {
  const onSubmit = useLatest(options.onSubmit)
  const controller = useController(() =>
    createForm<T>({ ...options, onSubmit: (v) => onSubmit.current?.(v) }),
  )
  const state = useStore(controller)
  return { state, controller }
}

// ---------------------------------------------------------------- data-table

export function useDataTable<T>(options: DataTableOptions<T>) {
  const controller = useController(() => createDataTable(options))
  // data / columns の差し替えは描画後に反映する (描画中にストアを書き換えないため)。
  useLayoutEffect(() => controller.setData(options.data), [controller, options.data])
  useLayoutEffect(() => controller.setColumns(options.columns), [controller, options.columns])
  const state = useStore(controller)
  return { table: controller.table, state, controller }
}

/** 無限スクロールの読み込み。アンマウントで検索のタイマーを止める。 */
export function useInfiniteList<T>(options: InfiniteListOptions<T>) {
  const controller = useController(() => createInfiniteList(options))
  useEffect(() => () => controller.destroy(), [controller])
  const state = useStore(controller)
  return { state, controller }
}

export function useCursorPager<T>(options: CursorPagerOptions<T>) {
  const controller = useController(() => createCursorPager(options))
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
  deps: DependencyList,
): C | null {
  const [controller, setController] = useState<C | null>(null)
  useLayoutEffect(() => {
    const c = mount()
    // DOM が出来てからでないと作れないので、作ったものを state に載せて再描画させる (意図的)。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setController(c)
    return () => {
      c?.destroy()
      setController(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 呼び出し側が deps を明示する
  }, deps)
  return controller
}
