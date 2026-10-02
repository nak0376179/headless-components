import { createColumnHelper } from "@/utils"

export type Employee = {
  email: string
  name: string
  department: string
  status: "active" | "onLeave" | "retired"
  salary: number
}

const STATUS_LABEL = { active: "在籍", onLeave: "休職", retired: "退職" } as const
const yen = (n: number) => `¥${n.toLocaleString()}`

// TanStack Table の列定義をそのまま使う (UI に依らないので React / Vue で同じ)。
const h = createColumnHelper<Employee>()
export const columns = [
  h.accessor("name", { header: "氏名" }),
  h.accessor("department", { header: "部署" }),
  h.accessor("status", {
    header: "状態",
    cell: (info) => STATUS_LABEL[info.getValue()],
    // フリーワード検索は画面の文字 (在籍・休職) で当てる。省略すると値 ("active") で探す
    meta: { searchText: (v) => STATUS_LABEL[v] },
  }),
  h.accessor("salary", {
    header: "給与",
    cell: (info) => yen(info.getValue()),
    meta: { searchText: (v) => `${yen(v)} ${v}` },
  }),
]
