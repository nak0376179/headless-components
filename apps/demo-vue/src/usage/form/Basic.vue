<script setup lang="ts">
import { email, maxChars, required, whenFilled } from "@hc/core"
import { useForm } from "@hc/vue"

type Values = { name: string; email: string }

// 値・検査・触れたか・送信中は composable が持つ。Vuetify の部品には値と変更・blur・エラーを渡すだけ。
const { state, controller: form } = useForm<Values>({
  initial: { name: "", email: "" },
  rules: {
    name: [required("氏名を入力してください"), maxChars(20)], // 配列は順に当て、最初のエラーを出す
    email: [required(), whenFilled(email())], // CSV 変換の検査 (email など) をそのまま使える
  },
  onSubmit: async (values) => {
    await fetch("/api/signup", { method: "POST", body: JSON.stringify(values) })
    // 投げた例外は state.submitError に入る
  },
})
// エラーは離れた後か送信を押した後だけ出る。state を読んでおくと変化で描き直される
const err = (k: keyof Values) => {
  void state.value
  return form.fieldError(k) ?? undefined
}
</script>

<template>
  <!-- 検査に通れば onSubmit を呼ぶ -->
  <form @submit.prevent="form.submit()">
    <v-text-field
      label="氏名"
      :model-value="state.values.name"
      :error-messages="err('name')"
      @update:model-value="(v: string) => form.setValue('name', v)"
      @blur="form.touch('name')"
    />
    <v-text-field
      label="メールアドレス"
      :model-value="state.values.email"
      :error-messages="err('email')"
      @update:model-value="(v: string) => form.setValue('email', v)"
      @blur="form.touch('email')"
    />
    <v-btn type="submit" :loading="state.submitting">送信</v-btn>
  </form>
</template>
