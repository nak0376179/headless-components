import { Chip } from "@mui/material"
import { createColumnHelper } from "@hc/core"
import {
  EMPLOYEE_HEADERS as H,
  STATUS_COLOR,
  STATUS_LABEL,
  formatSalary,
  type Employee,
  type Status,
} from "@hc/demo-data"

export function StatusChip({ status }: { status: Status }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={STATUS_LABEL[status]}
      color={STATUS_COLOR[status]}
    />
  )
}

export const employeeColumnHelper = createColumnHelper<Employee>()
const h = employeeColumnHelper

/** 従業員表の列定義 (TanStack の列定義。cell だけ MUI で描く)。 */
export const employeeColumns = [
  h.accessor("email", { header: H.email }),
  h.accessor("name", { header: H.name }),
  h.accessor("department", { header: H.department }),
  h.accessor("role", { header: H.role }),
  h.accessor("status", {
    header: H.status,
    // フリーワード検索は画面の表示名 (在籍・休職…) で当てる
    meta: { searchText: (v) => STATUS_LABEL[v] },
    cell: (info) => <StatusChip status={info.getValue()} />,
  }),
  h.accessor("joinedAt", { header: H.joinedAt }),
  h.accessor("salary", {
    header: H.salary,
    cell: (info) => formatSalary(info.getValue()),
    // 「¥5,200,000」でも「5200000」でも当たるように両方
    meta: { searchText: (v) => `${formatSalary(v)} ${v}` },
  }),
]
