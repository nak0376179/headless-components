<script lang="ts">
// 1. アプリで 1 つ作る (dialogs.ts などに置き、どこからでも import して使う)
import { createDialogs } from "@/utils/draft"
export const dialogs = createDialogs()
</script>

<script setup lang="ts">
import DialogHost from "@/components/draft/DialogHost.vue"

const props = defineProps<{ name: string; onDelete: () => Promise<void> }>()

// 3. 使う所では await するだけ (開く・閉じる・送信中の状態を自分で持たなくてよい)
const remove = async () => {
  const ok = await dialogs.confirm({
    title: `「${props.name}」を削除しますか？`,
    message: "この操作は元に戻せません。",
    danger: true, // 赤いボタン・既定の文言は「削除」
    // 押したら削除が終わるまで送信中のまま。失敗したら閉じずにエラーと「もう一度」を出す
    onConfirm: props.onDelete,
  })
  if (ok) await dialogs.alert({ title: "削除しました" })
}

// 入力してもらう: キャンセルなら null。validate が通るまで OK を押せない
const rename = () =>
  dialogs.prompt({
    title: "名前を変える",
    label: "新しい名前",
    defaultValue: props.name,
    validate: (v) => (v.trim() ? null : "入力してください"),
  })
</script>

<template>
  <v-btn color="error" @click="remove">削除</v-btn>
  <v-btn @click="rename">名前を変える</v-btn>
  <!-- 2. アプリの一番外側 (App.vue) に 1 か所だけ置く -->
  <DialogHost :dialogs="dialogs" />
</template>
