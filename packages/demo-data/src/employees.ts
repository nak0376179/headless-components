// 従業員データのデモ。旧 react-components では FastAPI + DynamoDB (floci) が担っていた部分を、
// ブラウザ内のデータソース (createMemorySource) に置き換えた。バックエンドは立てない。
import {
  createMemorySource,
  createStore,
  fetchAllPages,
  type MemorySource,
  type ReadableStore,
} from "@hc/core"
import seed from "./employees.json"

export type Status = "active" | "onLeave" | "retired"

export type Employee = {
  email: string
  name: string
  department: string
  role: string
  status: Status
  joinedAt: string
  salary: number
}

export const DEPARTMENTS = ["営業", "エンジニアリング", "人事", "マーケティング", "経理"] as const
export const ROLES = ["メンバー", "リーダー", "マネージャー", "ディレクター"] as const

export const STATUS_LABEL: Record<Status, string> = {
  active: "在籍",
  onLeave: "休職",
  retired: "退職",
}

/** MUI の Chip color と Vuetify の color の両方で通る名前。 */
export const STATUS_COLOR: Record<Status, "success" | "warning" | "default"> = {
  active: "success",
  onLeave: "warning",
  retired: "default",
}

/** 年収を「¥3,500,000」形式に整形する。 */
export const formatSalary = (salary: number): string => `¥${salary.toLocaleString()}`

/** 表の列見出し (列定義は描画が UI ごとに違うので、見出しと順序だけ共有する)。 */
export const EMPLOYEE_HEADERS: Record<keyof Employee, string> = {
  email: "メールアドレス",
  name: "氏名",
  department: "部署",
  role: "役職",
  status: "状態",
  joinedAt: "入社日",
  salary: "年収",
}

export const SEED_EMPLOYEES = seed as Employee[]

/** 氏名・部署・役職で検索する (旧バックエンドの FilterExpression と同じ対象)。 */
const matches = (e: Employee, search: string) =>
  [e.name, e.department, e.role].some((v) => v.includes(search))

/** ブラウザ内の従業員 API。latencyMs でネットワーク越しの遅さを真似る。 */
export function createEmployeeSource(latencyMs = 250): MemorySource<Employee> {
  return createMemorySource({ items: SEED_EMPLOYEES, getKey: (e) => e.email, matches, latencyMs })
}

export const emptyEmployee = (): Employee => ({
  email: "",
  name: "",
  department: DEPARTMENTS[0],
  role: ROLES[0],
  status: "active",
  joinedAt: new Date().toISOString().slice(0, 10),
  salary: 4000000,
})

/** 入力チェック (旧バックエンドの pydantic モデル相当)。問題なければ null。 */
export function validateEmployee(e: Employee): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.email)) return "メールアドレスの形式ではありません"
  if (e.name.trim() === "") return "氏名は必須です"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.joinedAt)) return "入社日は YYYY-MM-DD で入力してください"
  if (!Number.isInteger(e.salary) || e.salary < 0) return "年収は 0 以上の整数で入力してください"
  return null
}

// ---------------------------------------------------------------- 一覧 + 追加・編集・削除の画面状態

export interface EmployeeDirectoryState {
  items: Employee[]
  loading: boolean
  error: string | null
  /** 追加・編集ダイアログ (閉じていれば null)。 */
  form: {
    mode: "create" | "edit"
    value: Employee
    submitting: boolean
    error: string | null
  } | null
  /** 削除の確認ダイアログ (閉じていれば null)。 */
  deleting: { employee: Employee; submitting: boolean; error: string | null } | null
}

export interface EmployeeDirectory extends ReadableStore<EmployeeDirectoryState> {
  reload(): Promise<void>
  openCreate(): void
  openEdit(employee: Employee): void
  updateForm(patch: Partial<Employee>): void
  closeForm(): void
  submitForm(): Promise<void>
  askDelete(employee: Employee): void
  cancelDelete(): void
  confirmDelete(): Promise<void>
}

/**
 * 「全件を分割取得して表に出し、追加・編集・削除したら取り直す」画面のヘッドレスな状態。
 * MUI 版・Vuetify 版のデモはこの状態を描くだけ。
 */
export function createEmployeeDirectory(source: MemorySource<Employee>): EmployeeDirectory {
  const store = createStore<EmployeeDirectoryState>({
    items: [],
    loading: true,
    error: null,
    form: null,
    deleting: null,
  })
  const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

  const reload = async () => {
    store.patch({ loading: true, error: null })
    try {
      // 1 レスポンスを小さく保つため、25 件ずつ nextCursor が尽きるまで取って結合する。
      store.patch({ items: await fetchAllPages(source.fetchPage, 25), loading: false })
    } catch (e) {
      store.patch({ loading: false, error: message(e) })
    }
  }
  void reload()

  const patchForm = (patch: Partial<NonNullable<EmployeeDirectoryState["form"]>>) => {
    const form = store.get().form
    if (form) store.patch({ form: { ...form, ...patch } })
  }
  const patchDeleting = (patch: Partial<NonNullable<EmployeeDirectoryState["deleting"]>>) => {
    const d = store.get().deleting
    if (d) store.patch({ deleting: { ...d, ...patch } })
  }

  return {
    get: store.get,
    subscribe: store.subscribe,
    reload,
    openCreate: () =>
      store.patch({
        form: { mode: "create", value: emptyEmployee(), submitting: false, error: null },
      }),
    openEdit: (employee) =>
      store.patch({
        form: { mode: "edit", value: { ...employee }, submitting: false, error: null },
      }),
    updateForm(patch) {
      const form = store.get().form
      if (form) patchForm({ value: { ...form.value, ...patch } })
    },
    closeForm: () => store.patch({ form: null }),
    async submitForm() {
      const form = store.get().form
      if (!form || form.submitting) return
      const invalid = validateEmployee(form.value)
      if (invalid) return patchForm({ error: invalid })
      patchForm({ submitting: true, error: null })
      try {
        if (form.mode === "create") await source.create(form.value)
        else await source.update(form.value.email, form.value)
        store.patch({ form: null })
        await reload()
      } catch (e) {
        patchForm({ submitting: false, error: message(e) })
      }
    },
    askDelete: (employee) =>
      store.patch({ deleting: { employee, submitting: false, error: null } }),
    cancelDelete: () => store.patch({ deleting: null }),
    async confirmDelete() {
      const d = store.get().deleting
      if (!d || d.submitting) return
      patchDeleting({ submitting: true, error: null })
      try {
        await source.remove(d.employee.email)
        store.patch({ deleting: null })
        await reload()
      } catch (e) {
        patchDeleting({ submitting: false, error: message(e) })
      }
    },
  }
}

const FAMILY = [
  "佐藤",
  "鈴木",
  "高橋",
  "田中",
  "伊藤",
  "渡辺",
  "山本",
  "中村",
  "小林",
  "加藤",
  "吉田",
  "山田",
]
const GIVEN = ["陽菜", "蓮", "結衣", "湊", "葵", "大翔", "凛", "悠真", "紬", "樹", "咲", "陸"]

/**
 * 無限スクロールのデモ用に、決まった並びで大量の従業員を作る (乱数を使わないので毎回同じ)。
 * 番号は 1 始まり、メールは member00001@… の形。
 */
export function generateEmployees(count: number): Employee[] {
  const statuses: Status[] = ["active", "active", "active", "onLeave", "retired"]
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1
    const year = 2000 + (n % 26)
    const month = String((n % 12) + 1).padStart(2, "0")
    const day = String((n % 28) + 1).padStart(2, "0")
    return {
      email: `member${String(n).padStart(5, "0")}@example.com`,
      name: `${FAMILY[n % FAMILY.length]} ${GIVEN[(n * 7) % GIVEN.length]}`,
      department: DEPARTMENTS[n % DEPARTMENTS.length],
      role: ROLES[(n * 3) % ROLES.length],
      status: statuses[(n * 5) % statuses.length],
      joinedAt: `${year}-${month}-${day}`,
      salary: 3000000 + ((n * 7919) % 90) * 100000,
    }
  })
}

/** 大量の従業員を返す模擬 API (無限スクロールのデモ用)。 */
export function createLargeEmployeeSource(count = 10000, latencyMs = 300): MemorySource<Employee> {
  return createMemorySource({
    items: generateEmployees(count),
    getKey: (e) => e.email,
    matches,
    latencyMs,
  })
}
