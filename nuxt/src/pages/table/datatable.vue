<script setup lang="ts">
// 全件を分割取得して表に出し、追加・編集・削除する。
// 画面の状態 (読み込み・ダイアログ・送信中・エラー) は @demo-data の createEmployeeDirectory が持つ。
import { h } from "vue"
import { VBtn } from "vuetify/components"
import DataTable from "@/components/DataTable.vue"
import { useStore } from "@/composables/useStore"
import {
  createEmployeeDirectory,
  createEmployeeSource,
  DEPARTMENTS,
  EMPLOYEE_HEADERS as H,
  ROLES,
  STATUS_LABEL,
  type Employee,
} from "@demo-data"
import { employeeColumnHelper, employeeColumns } from "@/demo/employeeColumns"

const dir = createEmployeeDirectory(createEmployeeSource())
const state = useStore(dir)

const columns = [
  ...employeeColumns,
  employeeColumnHelper.display({
    id: "actions",
    header: "操作",
    cell: (info) =>
      h("div", { class: "d-flex ga-1" }, [
        h(VBtn, {
          icon: "mdi-pencil",
          size: "x-small",
          variant: "text",
          title: "編集",
          onClick: () => dir.openEdit(info.row.original),
        }),
        h(VBtn, {
          icon: "mdi-delete",
          size: "x-small",
          variant: "text",
          title: "削除",
          onClick: () => dir.askDelete(info.row.original),
        }),
      ]),
  }),
]

// 読み取り専用タプルのままだと v-select が値を狭い型で推論するので string[] にしておく。
const departments: string[] = [...DEPARTMENTS]
const roles: string[] = [...ROLES]
const statusItems = Object.entries(STATUS_LABEL).map(([value, title]) => ({ value, title }))
const rowId = (e: Employee) => e.email
</script>

<template>
  <v-alert v-if="state.error" type="error" variant="tonal">
    {{ state.error }}
    <template #append>
      <v-btn size="small" variant="text" @click="dir.reload()">再試行</v-btn>
    </template>
  </v-alert>
  <div v-else>
    <div class="head mb-2">
      <span class="text-body-2 text-medium-emphasis">
        ブラウザ内の模擬 API から 25 件ずつ全件を取得して、並べ替え・検索・ページングは手元で行う
      </span>
      <div class="d-flex ga-2">
        <v-btn
          size="small"
          variant="text"
          prepend-icon="mdi-refresh"
          :disabled="state.loading"
          @click="dir.reload()"
        >
          再取得
        </v-btn>
        <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="dir.openCreate()">
          追加
        </v-btn>
      </div>
    </div>

    <div v-if="state.loading && state.items.length === 0" class="d-flex justify-center py-16">
      <v-progress-circular indeterminate />
    </div>
    <DataTable
      v-else
      :data="state.items"
      :columns="columns"
      :get-row-id="rowId"
      search-placeholder="フリーワード検索 (空白で区切ると AND。例: 営業 在籍)"
    />

    <v-dialog
      :model-value="state.form !== null"
      max-width="600"
      @update:model-value="dir.closeForm()"
    >
      <v-card
        v-if="state.form"
        :title="state.form.mode === 'create' ? '従業員を追加' : '従業員を編集'"
      >
        <v-card-text class="d-flex flex-column ga-3">
          <v-alert v-if="state.form.error" type="error" variant="tonal" density="compact">
            {{ state.form.error }}
          </v-alert>
          <v-text-field
            :label="H.email"
            type="email"
            :model-value="state.form.value.email"
            :disabled="state.form.mode === 'edit'"
            :hint="
              state.form.mode === 'edit' ? 'メールアドレスは識別子のため変更できません' : undefined
            "
            persistent-hint
            @update:model-value="(v: string) => dir.updateForm({ email: v })"
          />
          <v-text-field
            :label="H.name"
            :model-value="state.form.value.name"
            @update:model-value="(v: string) => dir.updateForm({ name: v })"
          />
          <div class="d-flex ga-3">
            <v-select
              :label="H.department"
              :items="departments"
              :model-value="state.form.value.department"
              @update:model-value="(v: string) => dir.updateForm({ department: v })"
            />
            <v-select
              :label="H.role"
              :items="roles"
              :model-value="state.form.value.role"
              @update:model-value="(v: string) => dir.updateForm({ role: v })"
            />
          </div>
          <div class="d-flex ga-3">
            <v-select
              :label="H.status"
              :items="statusItems"
              :model-value="state.form.value.status"
              @update:model-value="(v: Employee['status']) => dir.updateForm({ status: v })"
            />
            <v-text-field
              :label="H.joinedAt"
              type="date"
              :model-value="state.form.value.joinedAt"
              @update:model-value="(v: string) => dir.updateForm({ joinedAt: v })"
            />
            <v-text-field
              :label="H.salary"
              type="number"
              :model-value="state.form.value.salary"
              @update:model-value="(v: string) => dir.updateForm({ salary: Number(v) })"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="state.form.submitting" @click="dir.closeForm()">キャンセル</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="state.form.submitting"
            @click="dir.submitForm()"
          >
            {{ state.form.mode === "create" ? "追加" : "保存" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="state.deleting !== null"
      max-width="480"
      @update:model-value="dir.cancelDelete()"
    >
      <v-card v-if="state.deleting" title="従業員を削除しますか？">
        <v-card-text>
          {{ state.deleting.employee.name }}（{{
            state.deleting.employee.email
          }}）を削除します。この操作は元に戻せません。
          <v-alert
            v-if="state.deleting.error"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ state.deleting.error }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="state.deleting.submitting" @click="dir.cancelDelete()"
            >キャンセル</v-btn
          >
          <v-btn color="error" :loading="state.deleting.submitting" @click="dir.confirmDelete()">
            削除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
</style>
