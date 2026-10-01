import {
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
  type ShallowRef,
  type WatchSource,
} from "vue"

export interface Destroyable {
  destroy(): void
}

/**
 * DOM 要素に取り付けるコントローラ (演出系など) を、マウント後に作ってアンマウントで破棄する。
 * mount が null を返したら (要素がまだ無いなど) 何もしない。deps が変われば作りなおす。
 * onMounted はサーバー側 (SSR) では走らないので、Nuxt でもそのまま使える。
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
