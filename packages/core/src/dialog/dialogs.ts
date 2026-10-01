// 確認・お知らせ・入力のダイアログを Promise で開くヘッドレスなコントローラ。
//
//   const ok = await dialogs.confirm({ title: "削除しますか？", danger: true })
//   const name = await dialogs.prompt({ title: "名前を変える", defaultValue: "旧名" })
//
// - 開いているダイアログは state.stack に積まれる (上に重ねて開ける)。UI (MUI / Vuetify) はそれを描くだけ
// - onConfirm に非同期の処理を渡すと、押してから終わるまで busy にし、失敗したら閉じずに error を出す
import { createStore, type ReadableStore } from "../store"

export type DialogKind = "confirm" | "alert" | "prompt"

export interface DialogBaseOptions {
  title: string
  message?: string
  okLabel?: string
  /** 危ない操作 (削除など) の見た目にする。 */
  danger?: boolean
}

export interface ConfirmOptions extends DialogBaseOptions {
  cancelLabel?: string
  /** 押したときの処理。終わるまでダイアログは開いたまま busy、投げたら error を出して閉じない。 */
  onConfirm?: () => void | Promise<void>
}

export interface PromptOptions extends DialogBaseOptions {
  cancelLabel?: string
  label?: string
  defaultValue?: string
  placeholder?: string
  /** 入力の検査 (理由か null)。通るまで OK を押せない。 */
  validate?: (value: string) => string | null
  onConfirm?: (value: string) => void | Promise<void>
}

/** 描画用の 1 件分。 */
export interface DialogEntry {
  id: number
  kind: DialogKind
  title: string
  message?: string
  okLabel: string
  cancelLabel: string | null
  danger: boolean
  /** prompt の入力欄。 */
  input: { label?: string; placeholder?: string; value: string; error: string | null } | null
  /** onConfirm の実行中。 */
  busy: boolean
  /** onConfirm が投げた例外のメッセージ。 */
  error: string | null
}

export interface DialogsState {
  /** 開いている順。最後が一番手前。 */
  stack: DialogEntry[]
}

export interface DialogsController extends ReadableStore<DialogsState> {
  confirm(options: ConfirmOptions): Promise<boolean>
  alert(options: DialogBaseOptions): Promise<void>
  /** 入力した文字。キャンセルなら null。 */
  prompt(options: PromptOptions): Promise<string | null>
  /** OK を押した (UI から呼ぶ)。 */
  accept(id: number): Promise<void>
  /** キャンセル・閉じる・Esc (UI から呼ぶ)。busy の間は閉じない。 */
  dismiss(id: number): void
  /** prompt の入力 (UI から呼ぶ)。 */
  setInput(id: number, value: string): void
  /** 開いているものを全部キャンセル扱いで閉じる (画面を離れるときなど)。 */
  dismissAll(): void
}

interface Pending {
  resolve: (value: unknown) => void
  cancelValue: unknown
  okValue: (entry: DialogEntry) => unknown
  onConfirm?: (entry: DialogEntry) => void | Promise<void>
  validate?: (value: string) => string | null
}

export function createDialogs(): DialogsController {
  const store = createStore<DialogsState>({ stack: [] })
  const pending = new Map<number, Pending>()
  let seq = 0

  const find = (id: number) => store.get().stack.find((d) => d.id === id)
  const update = (id: number, patch: Partial<DialogEntry>) =>
    store.patch({
      stack: store.get().stack.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })
  const close = (id: number, value: unknown) => {
    const p = pending.get(id)
    pending.delete(id)
    store.patch({ stack: store.get().stack.filter((d) => d.id !== id) })
    p?.resolve(value)
  }
  const open = <R>(
    entry: Omit<DialogEntry, "id" | "busy" | "error">,
    p: Omit<Pending, "resolve">,
  ): Promise<R> =>
    new Promise<R>((resolve) => {
      const id = ++seq
      pending.set(id, { ...p, resolve: resolve as (v: unknown) => void })
      store.patch({ stack: [...store.get().stack, { ...entry, id, busy: false, error: null }] })
    })

  const base = (o: DialogBaseOptions) => ({
    title: o.title,
    message: o.message,
    danger: o.danger ?? false,
  })

  return {
    get: store.get,
    subscribe: store.subscribe,
    confirm: (o) =>
      open<boolean>(
        {
          ...base(o),
          kind: "confirm",
          okLabel: o.okLabel ?? (o.danger ? "削除" : "OK"),
          cancelLabel: o.cancelLabel ?? "キャンセル",
          input: null,
        },
        {
          cancelValue: false,
          okValue: () => true,
          onConfirm: o.onConfirm ? () => o.onConfirm?.() : undefined,
        },
      ),
    alert: (o) =>
      open<void>(
        { ...base(o), kind: "alert", okLabel: o.okLabel ?? "OK", cancelLabel: null, input: null },
        { cancelValue: undefined, okValue: () => undefined },
      ),
    prompt: (o) => {
      const value = o.defaultValue ?? ""
      return open<string | null>(
        {
          ...base(o),
          kind: "prompt",
          okLabel: o.okLabel ?? "OK",
          cancelLabel: o.cancelLabel ?? "キャンセル",
          input: {
            label: o.label,
            placeholder: o.placeholder,
            value,
            error: o.validate?.(value) ?? null,
          },
        },
        {
          cancelValue: null,
          okValue: (e) => e.input?.value ?? "",
          onConfirm: o.onConfirm ? (e) => o.onConfirm?.(e.input?.value ?? "") : undefined,
          validate: o.validate,
        },
      )
    },
    async accept(id) {
      const entry = find(id)
      const p = pending.get(id)
      if (!entry || !p || entry.busy || entry.input?.error) return
      if (p.onConfirm) {
        update(id, { busy: true, error: null })
        try {
          await p.onConfirm(entry)
        } catch (e) {
          update(id, { busy: false, error: e instanceof Error ? e.message : String(e) })
          return
        }
      }
      close(id, p.okValue(find(id) ?? entry))
    },
    dismiss(id) {
      const entry = find(id)
      if (!entry || entry.busy) return
      close(id, pending.get(id)?.cancelValue)
    },
    setInput(id, value) {
      const entry = find(id)
      if (!entry?.input) return
      const error = pending.get(id)?.validate?.(value) ?? null
      update(id, { input: { ...entry.input, value, error }, error: null })
    },
    dismissAll() {
      for (const d of [...store.get().stack]) close(d.id, pending.get(d.id)?.cancelValue)
    },
  }
}
