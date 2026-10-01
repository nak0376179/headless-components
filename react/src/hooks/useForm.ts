import { createForm, type FormOptions } from "@core"
import { useController, useLatest, useStore } from "@/hooks/useStore"

/** フォームの状態と操作。onSubmit は最新の関数を呼ぶ (描画のたびに作り直してよい)。 */
export function useForm<T extends object>(options: FormOptions<T>) {
  const onSubmit = useLatest(options.onSubmit)
  const controller = useController(() =>
    createForm<T>({ ...options, onSubmit: (v) => onSubmit.current?.(v) }),
  )
  const state = useStore(controller)
  return { state, controller }
}
