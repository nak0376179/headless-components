import { paginationSummary } from "@core"
import { useDataTable } from "@/hooks/useDataTable"
import { columns, type Employee } from "./columns"

// 見た目を自前で作る。table は TanStack Table 本体なので、そのまま getRowModel() などを読む。
export function MyTable({ data }: { data: Employee[] }) {
  const { table, state } = useDataTable({ data, columns, initialPageSize: 10 })
  return (
    <>
      <input
        value={state.state.globalFilter ?? ""}
        onChange={(e) => table.setGlobalFilter(e.target.value)}
        placeholder="検索"
      />
      <table>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{String(cell.getValue())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span>{paginationSummary(table).label}</span>
      <button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
        前へ
      </button>
      <button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
        次へ
      </button>
    </>
  )
}
