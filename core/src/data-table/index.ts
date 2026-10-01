export { createDataTable, resolveTemplate, paginationSummary, PAGE_SIZE_OPTIONS } from "./table"
export { freeWordFilter, matchesFreeWord, normalizeSearchText, splitSearchTerms } from "./free-word"
export type {
  DataTableColumn,
  DataTableController,
  DataTableOptions,
  DataTableSnapshot,
} from "./table"
export { createCursorPager, fetchAllPages } from "./cursor-pager"
export { getDefaultQueryClient } from "./cursor-query"
export type { CursorQueryOptions } from "./cursor-query"
export type {
  CursorPage,
  CursorPagerController,
  CursorPagerOptions,
  CursorPagerState,
  FetchPage,
  PageRequest,
} from "./cursor-pager"
export { createInfiniteList, virtualWindow } from "./infinite-list"
export type {
  InfiniteListController,
  InfiniteListOptions,
  InfiniteListState,
  VirtualWindow,
  VirtualWindowInput,
} from "./infinite-list"
export { createMemorySource } from "./memory-source"
export type { MemorySource, MemorySourceOptions } from "./memory-source"
// 列定義を組み立てるヘルパーは table-core のものをそのまま再公開する。
export { createColumnHelper } from "@tanstack/table-core"
export type { Table, Row, Cell, Header, CellContext, HeaderContext } from "@tanstack/table-core"
