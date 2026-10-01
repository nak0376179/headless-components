// フォームの状態 (値・検査結果・触れたか・送信中) を持つヘッドレスなコントローラ。
// テキストボックス・セレクト・チェックボックス・ラジオ・AutoComplete のどれでも、値を setValue で入れるだけ。
// 見た目 (MUI / Vuetify) は state を描き、エラーは fieldError(key) を出す。
import { createStore, type ReadableStore } from "../store"

/** 項目の検査。エラーなら理由 (日本語) を、問題なければ null を返す。2 つ目の引数で他の項目も見られる。 */
export type FieldRule<V, T> = (value: V, values: T) => string | null

export type FormRules<T> = { [K in keyof T]?: FieldRule<T[K], T> | FieldRule<T[K], T>[] }

export interface FormOptions<T extends object> {
  initial: T
  /** 項目ごとの検査 (配列なら順に当て、最初のエラーを出す)。 */
  rules?: FormRules<T>
  /** 検査を通ったときに呼ばれる。投げた例外は submitError に入る。 */
  onSubmit?: (values: T) => void | Promise<void>
}

export interface FormState<T> {
  values: T
  /** 検査に落ちた項目の理由 (表示するかは fieldError が決める)。 */
  errors: Partial<Record<keyof T, string>>
  /** 一度でも離れた (blur した) 項目。 */
  touched: Partial<Record<keyof T, boolean>>
  /** 初期値から変わったか。 */
  dirty: boolean
  submitting: boolean
  /** 送信を押した回数 (1 回でも押したら全項目のエラーを出す)。 */
  submitCount: number
  /** onSubmit が投げた例外のメッセージ。 */
  submitError: string | null
}

export interface FormController<T extends object> extends ReadableStore<FormState<T>> {
  setValue<K extends keyof T>(key: K, value: T[K]): void
  /** 離れた (blur) ことを記録する。以降その項目のエラーを出す。 */
  touch(key: keyof T): void
  /** 画面に出すエラー (触れたか送信を押した項目だけ)。 */
  fieldError(key: keyof T): string | null
  /** 全項目を検査する。通れば true。 */
  validate(): boolean
  /** 検査して、通れば onSubmit を呼ぶ。送信できたら true。 */
  submit(): Promise<boolean>
  /** 初期値 (または渡した値) に戻す。 */
  reset(values?: T): void
}

function runRules<T extends object>(
  rules: FormRules<T>,
  values: T,
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {}
  for (const key of Object.keys(rules) as (keyof T)[]) {
    const r = rules[key]
    const list = (Array.isArray(r) ? r : r ? [r] : []) as FieldRule<T[keyof T], T>[]
    for (const fn of list) {
      const reason = fn(values[key], values)
      if (reason !== null) {
        errors[key] = reason
        break
      }
    }
  }
  return errors
}

const sameValue = (a: unknown, b: unknown): boolean =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
    : Object.is(a, b)

export function createForm<T extends object>(options: FormOptions<T>): FormController<T> {
  const rules = options.rules ?? {}
  let initial = options.initial
  const isDirty = (values: T) =>
    (Object.keys(values) as (keyof T)[]).some((k) => !sameValue(values[k], initial[k]))

  const store = createStore<FormState<T>>({
    values: initial,
    errors: runRules(rules, initial),
    touched: {},
    dirty: false,
    submitting: false,
    submitCount: 0,
    submitError: null,
  })

  const validate = () => {
    const errors = runRules(rules, store.get().values)
    store.patch({ errors })
    return Object.keys(errors).length === 0
  }

  return {
    get: store.get,
    subscribe: store.subscribe,
    setValue(key, value) {
      const values = { ...store.get().values, [key]: value }
      store.patch({ values, errors: runRules(rules, values), dirty: isDirty(values) })
    },
    touch(key) {
      if (store.get().touched[key]) return
      store.patch({ touched: { ...store.get().touched, [key]: true } })
    },
    fieldError(key) {
      const s = store.get()
      return s.touched[key] || s.submitCount > 0 ? (s.errors[key] ?? null) : null
    },
    validate,
    async submit() {
      store.patch({ submitCount: store.get().submitCount + 1, submitError: null })
      if (!validate()) return false
      store.patch({ submitting: true })
      try {
        await options.onSubmit?.(store.get().values)
        return true
      } catch (e) {
        store.patch({ submitError: e instanceof Error ? e.message : String(e) })
        return false
      } finally {
        store.patch({ submitting: false })
      }
    },
    reset(values) {
      if (values) initial = values
      store.set({
        values: initial,
        errors: runRules(rules, initial),
        touched: {},
        dirty: false,
        submitting: false,
        submitCount: 0,
        submitError: null,
      })
    },
  }
}

// ---------------------------------------------------------------- 検査

/** 必須。文字列は前後の空白を除いて空でないこと、配列は 1 つ以上、それ以外は null / undefined でないこと。 */
export const required =
  (message = "入力してください") =>
  (value: unknown): string | null => {
    if (typeof value === "string")
      return value.replace(/^[\s\u3000]+|[\s\u3000]+$/g, "") ? null : message
    if (Array.isArray(value)) return value.length > 0 ? null : message
    return value === null || value === undefined ? message : null
  }

/** 文字数の上限 (コードポイントで数える)。空文字は通す (必須は required で見る)。 */
export const maxChars =
  (max: number, message = `${max} 文字以内で入力してください`) =>
  (value: string): string | null =>
    [...value].length <= max ? null : message

/** 配列の個数の範囲 (チェックボックス・複数選択)。 */
export const countBetween =
  (min: number, max: number, message = `${min}〜${max} 個選んでください`) =>
  (value: readonly unknown[]): string | null =>
    value.length >= min && value.length <= max ? null : message

/**
 * 文字列の検査 (CSV 変換の email() / numeric() / zenkakuKatakana() など) をフォームで使う。
 * 空文字のときは通す (必須は required で見る)。
 */
export const whenFilled =
  (validator: (value: string) => string | null) =>
  (value: string): string | null =>
    value === "" ? null : validator(value)

// ---------------------------------------------------------------- 選択の補助

/** 配列に入っていれば外し、無ければ足す (チェックボックスの一覧を値として持つとき)。順序は options に合わせる。 */
export function toggleInList<V>(list: readonly V[], item: V, order?: readonly V[]): V[] {
  const next = list.includes(item) ? list.filter((v) => v !== item) : [...list, item]
  return order ? order.filter((v) => next.includes(v)) : next
}
