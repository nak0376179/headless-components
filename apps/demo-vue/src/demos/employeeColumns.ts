import { h } from "vue"
import { VChip } from "vuetify/components"
import { createColumnHelper } from "@hc/core"
import {
  EMPLOYEE_HEADERS as H,
  STATUS_COLOR,
  STATUS_LABEL,
  formatSalary,
  type Employee,
} from "@hc/demo-data"

export const employeeColumnHelper = createColumnHelper<Employee>()
const c = employeeColumnHelper

/** 従業員表の列定義 (TanStack の列定義。cell だけ h() + Vuetify で描く)。 */
export const employeeColumns = [
  c.accessor("email", { header: H.email }),
  c.accessor("name", { header: H.name }),
  c.accessor("department", { header: H.department }),
  c.accessor("role", { header: H.role }),
  c.accessor("status", {
    header: H.status,
    // フリーワード検索は画面の表示名 (在籍・休職…) で当てる
    meta: { searchText: (v) => STATUS_LABEL[v] },
    cell: (info) =>
      h(
        VChip,
        {
          size: "small",
          variant: "outlined",
          color:
            STATUS_COLOR[info.getValue()] === "default" ? undefined : STATUS_COLOR[info.getValue()],
        },
        () => STATUS_LABEL[info.getValue()],
      ),
  }),
  c.accessor("joinedAt", { header: H.joinedAt }),
  c.accessor("salary", {
    header: H.salary,
    cell: (info) => formatSalary(info.getValue()),
    // 「¥5,200,000」でも「5200000」でも当たるように両方
    meta: { searchText: (v) => `${formatSalary(v)} ${v}` },
  }),
]
