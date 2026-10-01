import { useLayoutEffect, useState, type DependencyList } from "react"

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
