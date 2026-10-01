import { createForm, type FormOptions } from "@core"
import { useStore } from "@/composables/useStore"

/** フォームの状態と操作。state は shallowRef (テンプレートでは state.values.name のように読める)。 */
export function useForm<T extends object>(options: FormOptions<T>) {
  const controller = createForm<T>(options)
  const state = useStore(controller)
  return { state, controller }
}
