// utils (@/utils) — React にも Vue にも依存しないヘッドレスなロジック (main)。
// 各機能は「状態を ReadableStore で公開するコントローラ」として提供し、
// 見た目 (MUI / Vuetify) は components/ がこの状態を描くだけにする。
//
// main は 2 つ: CSV/TSV → JSON 変換 (csv-json) と、データテーブル (data-table: TanStack Table で
// クライアント側のページング・フリーワード検索。取得はアプリの TanStack Query で fetchAllPages を呼ぶ)。
// それ以外 (フォーム・ダイアログ・演出・サーバーページネーション・無限スクロール) は draft (@/utils/draft)。
export { createStore } from "./store"
export type { Listener, ReadableStore, Store } from "./store"
export * from "./csv-json"
export * from "./data-table"
