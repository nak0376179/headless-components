<script setup lang="ts">
// 全件を TanStack Query (useQuery) で取り、並べ替え・フリーワード検索・ページングは
// 手元 (TanStack Table) で行う。取得結果はキャッシュされ、別のページへ行って戻っても取り直さない。
import { computed } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { fetchAllPages } from "@/utils"
import DataTable from "@/components/DataTable.vue"
import { createLargeEmployeeSource, type Employee } from "@demo-data"
import { employeeColumns } from "@/demo/employeeColumns"

const TOTAL = 1000
const EMPTY: Employee[] = []
const source = createLargeEmployeeSource(TOTAL, 200)
const fail = { on: false } // 「取得を失敗させる」(エラー表示の確認用)

const { data, error, isFetching, dataUpdatedAt, refetch } = useQuery({
  queryKey: ["employees", TOTAL],
  queryFn: () => {
    if (fail.on) throw new Error("取得に失敗しました (模擬)")
    return fetchAllPages(source.fetchPage, 250)
  },
})
const updated = computed(() =>
  dataUpdatedAt.value ? new Date(dataUpdatedAt.value).toLocaleTimeString() : "—",
)
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <p class="text-body-2 text-medium-emphasis">
      {{ TOTAL.toLocaleString() }} 件を API から 250 件ずつ取りまとめ (fetchAllPages)、useQuery
      でキャッシュする。検索は空白区切りの AND (「営業 在籍」)
      で、全角/半角・ひらがな/カタカナの違いを無視し、画面の文字 (「在籍」「¥5,200,000」)
      でも当たる。
    </p>
    <div class="d-flex align-center ga-4 flex-wrap">
      <v-btn
        variant="outlined"
        size="small"
        prepend-icon="mdi-refresh"
        :disabled="isFetching"
        @click="refetch()"
      >
        再読み込み
      </v-btn>
      <v-switch
        label="取得を失敗させる"
        density="compact"
        hide-details
        color="primary"
        @update:model-value="(v) => (fail.on = !!v)"
      />
      <span class="text-body-2 text-medium-emphasis">
        最終取得 {{ updated }}{{ isFetching ? " · 取得中…" : "" }}
      </span>
    </div>
    <DataTable
      :data="data ?? EMPTY"
      :columns="employeeColumns"
      :get-row-id="(e: Employee) => e.email"
      :initial-page-size="25"
      search-placeholder="フリーワード検索 (空白で区切ると AND)"
      :loading="isFetching"
      :error="error?.message"
      @retry="refetch()"
    />
  </div>
</template>
