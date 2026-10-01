<script setup lang="ts">
import { ref } from "vue"
import { createDialogs, email, required, whenFilled } from "@hc/core"
import { DialogHost } from "@hc/vuetify"
import { useForm } from "@hc/vue"

// アプリで 1 つ作って使い回す (普通はアプリの一番外側に <DialogHost :dialogs="dialogs" /> を置く)。
const dialogs = createDialogs()
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const log = ref<string[]>([])
const note = (s: string) => {
  log.value = [`${new Date().toLocaleTimeString()}  ${s}`, ...log.value].slice(0, 8)
}

const samples: { title: string; body: string; run: () => Promise<void> }[] = [
  {
    title: "🗑️ 削除の確認",
    body: "危ない操作は赤いボタンにする。結果は true / false で返る。",
    run: async () => {
      const ok = await dialogs.confirm({
        title: "「2026年度 予算.xlsx」を削除しますか？",
        message: "ゴミ箱には入りません。この操作は元に戻せません。",
        danger: true,
      })
      note(`削除の確認 → ${ok}`)
    },
  },
  {
    title: "⏳ 送信してから閉じる",
    body: "OK を押すと送信中になり、終わるまで閉じない。1 回目はわざと失敗させるので「もう一度」を押す。",
    run: async () => {
      let tries = 0
      const ok = await dialogs.confirm({
        title: "申請を送信しますか？",
        message: "上長に承認依頼のメールが届きます。",
        okLabel: "送信",
        onConfirm: async () => {
          await wait(900)
          if (++tries === 1) throw new Error("通信に失敗しました。もう一度お試しください。")
        },
      })
      note(`送信 → ${ok} (${tries} 回目で成功)`)
    },
  },
  {
    title: "✏️ 名前を入力",
    body: "入力の検査が通るまで OK を押せない。Enter でも決定できる (変換中の Enter は無視)。",
    run: async () => {
      const name = await dialogs.prompt({
        title: "新しいフォルダ",
        label: "フォルダ名",
        defaultValue: "無題のフォルダ",
        validate: (v) =>
          !v.trim() ? "入力してください" : /[\\/:*?"<>|]/.test(v) ? "使えない文字があります" : null,
      })
      note(`フォルダ名 → ${JSON.stringify(name)}`)
    },
  },
  {
    title: "🔁 続けて聞く",
    body: "await を並べるだけで、確認 → 入力 → お知らせの流れを書ける。",
    run: async () => {
      if (!(await dialogs.confirm({ title: "招待を送りますか？" }))) return note("招待 → やめた")
      const mail = await dialogs.prompt({
        title: "招待する人",
        label: "メールアドレス",
        placeholder: "taro@example.com",
        validate: (v) => required()(v) ?? whenFilled(email())(v),
      })
      if (mail === null) return note("招待 → 入力でやめた")
      await dialogs.alert({ title: "送りました", message: `${mail} に招待メールを送りました。` })
      note(`招待 → ${mail}`)
    },
  },
  {
    title: "🪟 上に重ねる",
    body: "ダイアログの中から別のダイアログを開ける (後から開いた方が手前)。",
    run: async () => {
      const p = dialogs.confirm({
        title: "編集中の内容があります",
        message: "保存せずに閉じますか？",
        okLabel: "閉じる",
      })
      await wait(400)
      await dialogs.alert({ title: "ℹ️ ヒント", message: "下のダイアログはまだ開いています。" })
      note(`重ねる → ${await p}`)
    },
  },
]

// 中身を自由に作るダイアログ (フォーム入り)
const formOpen = ref(false)
const { state, controller: form } = useForm({
  initial: { subject: "", body: "" },
  rules: { subject: required("件名を入力してください"), body: required("本文を入力してください") },
  onSubmit: async (v) => {
    await wait(700)
    note(`問い合わせ → ${v.subject}`)
    formOpen.value = false
    form.reset()
  },
})
const err = (k: "subject" | "body") => {
  void state.value
  return form.fieldError(k) ?? undefined
}
const closeForm = async () => {
  // 書きかけなら確かめてから閉じる (自作のダイアログからも createDialogs を使える)
  if (
    state.value.dirty &&
    !(await dialogs.confirm({
      title: "書きかけの内容を捨てますか？",
      okLabel: "捨てる",
      danger: true,
    }))
  )
    return
  form.reset()
  formOpen.value = false
}
</script>

<template>
  <div class="d-flex flex-column ga-6">
    <p class="text-body-2 text-medium-emphasis">
      確認・入力・お知らせを <code>await dialogs.confirm(...)</code> のように Promise
      で開く。開く・閉じる・ 送信中・エラーはコア (createDialogs) が持ち、Vuetify は DialogHost
      が描くだけ。
    </p>
    <v-row>
      <v-col v-for="s in samples" :key="s.title" cols="12" sm="6" md="4">
        <v-card variant="outlined" class="h-100 d-flex flex-column">
          <v-card-title class="text-subtitle-1 font-weight-bold">{{ s.title }}</v-card-title>
          <v-card-text class="flex-grow-1">{{ s.body }}</v-card-text>
          <v-card-actions><v-btn color="primary" @click="s.run()">開く</v-btn></v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card variant="outlined" class="h-100 d-flex flex-column">
          <v-card-title class="text-subtitle-1 font-weight-bold"
            >📝 フォームのダイアログ</v-card-title
          >
          <v-card-text class="flex-grow-1">
            中身を自由に作るときは Vuetify の v-dialog に useForm を組み合わせる。
          </v-card-text>
          <v-card-actions
            ><v-btn color="primary" @click="formOpen = true">開く</v-btn></v-card-actions
          >
        </v-card>
      </v-col>
    </v-row>

    <v-card variant="outlined">
      <div class="text-caption text-medium-emphasis px-4 pt-2">返ってきた値</div>
      <v-list density="compact">
        <v-list-item v-if="log.length === 0" subtitle="まだありません" />
        <v-list-item v-for="(l, i) in log" :key="i">
          <code>{{ l }}</code>
        </v-list-item>
      </v-list>
    </v-card>

    <v-dialog
      :model-value="formOpen"
      max-width="560"
      :persistent="state.submitting"
      @update:model-value="(open: boolean) => !open && closeForm()"
    >
      <v-card title="お問い合わせ">
        <v-card-text>
          <v-alert v-if="state.submitError" type="error" class="mb-2">{{
            state.submitError
          }}</v-alert>
          <v-text-field
            label="件名"
            :model-value="state.values.subject"
            :error-messages="err('subject')"
            @update:model-value="(v: string) => form.setValue('subject', v)"
            @blur="form.touch('subject')"
          />
          <v-textarea
            label="本文"
            rows="4"
            :model-value="state.values.body"
            :error-messages="err('body')"
            @update:model-value="(v: string) => form.setValue('body', v)"
            @blur="form.touch('body')"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="state.submitting" @click="closeForm()">キャンセル</v-btn>
          <v-btn variant="flat" color="primary" :loading="state.submitting" @click="form.submit()">
            送信
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <DialogHost :dialogs="dialogs" />
  </div>
</template>
