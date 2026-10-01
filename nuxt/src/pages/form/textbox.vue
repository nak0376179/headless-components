<script setup lang="ts">
import { ref } from "vue"
import { email, maxChars, pattern, required, whenFilled, zenkakuKatakana } from "@core"
import { useForm } from "@/composables/useForm"
import FormShell from "@/demo/FormShell.vue"
import { fakeSave } from "@/demo/fakeSave"

type Profile = {
  name: string
  kana: string
  email: string
  phone: string
  zip: string
  bio: string
}
const initial: Profile = { name: "", kana: "", email: "", phone: "", zip: "", bio: "" }
const BIO_MAX = 200

const saved = ref<Profile | null>(null)
const { state, controller: form } = useForm<Profile>({
  initial,
  rules: {
    name: [required("氏名を入力してください"), maxChars(20)],
    kana: whenFilled(zenkakuKatakana()),
    email: [required("メールアドレスを入力してください"), whenFilled(email())],
    phone: whenFilled(pattern(/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/, "電話番号の形式ではありません")),
    zip: whenFilled(pattern(/^\d{3}-?\d{4}$/, "郵便番号は 123-4567 の形で入力してください")),
    bio: maxChars(BIO_MAX),
  },
  onSubmit: async (v) => {
    await fakeSave()
    saved.value = v
  },
})
// 1 項目ぶんの props (値・変更・離れた・エラー表示) をまとめて渡す
const field = (key: keyof Profile) => ({
  modelValue: state.value.values[key],
  "onUpdate:modelValue": (v: string) => form.setValue(key, v),
  onBlur: () => form.touch(key),
  errorMessages: form.fieldError(key) ?? undefined,
})
</script>

<template>
  <div class="d-flex flex-column ga-8">
    <FormShell
      title="📝 テキストボックス"
      description="入力しながら検査し、エラーは項目から離れた後か送信を押した後に出す。検査は CSV 変換と同じ関数 (email・zenkakuKatakana など) を使える。"
      :form="form"
      :state="state"
      :saved="saved"
    >
      <v-row density="compact">
        <v-col cols="12" sm="6"><v-text-field label="氏名 *" v-bind="field('name')" /></v-col>
        <v-col cols="12" sm="6">
          <v-text-field label="フリガナ" placeholder="ヤマダ タロウ" v-bind="field('kana')" />
        </v-col>
      </v-row>
      <v-text-field label="メールアドレス *" type="email" v-bind="field('email')" />
      <v-row density="compact">
        <v-col cols="12" sm="6">
          <v-text-field label="電話番号" placeholder="03-1234-5678" v-bind="field('phone')" />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field label="郵便番号" prefix="〒" v-bind="field('zip')" />
        </v-col>
      </v-row>
      <v-textarea
        label="自己紹介"
        rows="3"
        auto-grow
        v-bind="field('bio')"
        :hint="`${[...state.values.bio].length} / ${BIO_MAX} 文字`"
        persistent-hint
      />
    </FormShell>
  </div>
</template>
