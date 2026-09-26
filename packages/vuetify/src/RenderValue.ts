// 列定義の header / cell を解決した値 (文字列・数値・VNode) をそのまま描く関数型コンポーネント。
import type { FunctionalComponent, VNodeChild } from "vue"

const RenderValue: FunctionalComponent<{ value: unknown }> = (props) =>
  (props.value ?? null) as VNodeChild

RenderValue.props = ["value"]

export default RenderValue
