<script setup lang="ts">
// 冬の夜のログイン画面。ダイアログ (data-snow-target) の上に雪が積もり、ログインを押すと揺れて落ちる。
import { ref } from "vue"
import Snowfall from "@/components/effects/Snowfall.vue"
import { useForm } from "@/composables/useForm"
import { email, required, whenFilled } from "@core"

const STARS = Array.from({ length: 60 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 55}%`,
  size: `${1 + ((i * 7) % 3)}px`,
  delay: `${(i % 7) * 0.4}s`,
}))

const snow = ref<InstanceType<typeof Snowfall> | null>(null)
const card = ref<HTMLElement | null>(null)
const shaking = ref(false)
const welcome = ref<string | null>(null)
const { state, controller: form } = useForm({
  initial: { email: "", password: "", remember: true },
  rules: {
    email: [required("メールアドレスを入力してください"), whenFilled(email())],
    password: (v: string) => (v.length >= 4 ? null : "4 文字以上で入力してください"),
  },
  onSubmit: async (v) => {
    await new Promise((r) => setTimeout(r, 700))
    welcome.value = v.email
  },
})
const err = (k: "email" | "password") => {
  void state.value
  return form.fieldError(k) ?? undefined
}
const login = () => {
  // ダイアログを揺らして、積もった雪を払い落とす
  shaking.value = true
  if (card.value) snow.value?.controller?.shake(card.value)
  setTimeout(() => (shaking.value = false), 500)
  void form.submit()
}
const logout = () => {
  welcome.value = null
  form.reset()
}
</script>

<template>
  <Snowfall ref="snow" :intensity="90" :wind="18">
    <div class="scene">
      <span
        v-for="(s, i) in STARS"
        :key="i"
        class="star"
        :style="{
          left: s.left,
          top: s.top,
          width: s.size,
          height: s.size,
          animationDelay: s.delay,
        }"
      />
      <!-- 上のナビ (ここにも積もる) -->
      <div data-snow-target class="nav">
        <strong class="brand">❄️ Acme Cloud</strong>
        <v-spacer />
        <span v-for="t in ['製品', '料金', 'ドキュメント']" :key="t" class="text-body-2 nav-item">{{
          t
        }}</span>
      </div>
      <!-- 山の影絵 -->
      <svg class="mountains" viewBox="0 0 1200 220" preserveAspectRatio="none">
        <path
          d="M0 220 L0 140 L160 60 L300 150 L440 40 L620 160 L760 70 L920 150 L1060 50 L1200 130 L1200 220 Z"
          fill="#141a3c"
        />
        <path
          d="M0 220 L0 180 L220 110 L380 190 L560 120 L760 200 L960 120 L1200 190 L1200 220 Z"
          fill="#0d1230"
        />
      </svg>

      <!-- ログインのダイアログ (data-snow-target で上の縁に積もる) -->
      <div class="center">
        <div ref="card" data-snow-target :class="['card', { shaking }]">
          <div v-if="welcome" class="text-center py-8">
            <div class="text-h3">☃️</div>
            <div class="text-h6 mt-2">ようこそ</div>
            <p class="text-body-2 text-medium-emphasis">{{ welcome }} でログインしました</p>
            <v-btn variant="text" class="mt-2" @click="logout">ログアウト</v-btn>
          </div>
          <form v-else novalidate @submit.prevent="login">
            <div class="text-h5 font-weight-black text-center">ログイン</div>
            <p class="text-body-2 text-medium-emphasis text-center mb-6">
              しばらく放っておくと、ダイアログに雪が積もります
            </p>
            <v-text-field
              label="メールアドレス"
              :model-value="state.values.email"
              :error-messages="err('email')"
              @update:model-value="(v: string) => form.setValue('email', v)"
              @blur="form.touch('email')"
            />
            <v-text-field
              label="パスワード"
              type="password"
              :model-value="state.values.password"
              :error-messages="err('password')"
              @update:model-value="(v: string) => form.setValue('password', v)"
              @blur="form.touch('password')"
            />
            <v-checkbox
              label="ログインしたままにする"
              :model-value="state.values.remember"
              hide-details
              @update:model-value="(v) => form.setValue('remember', !!v)"
            />
            <v-btn type="submit" color="primary" size="large" block :loading="state.submitting">
              ログイン (雪を払う)
            </v-btn>
          </form>
        </div>
      </div>
    </div>
  </Snowfall>
</template>

<style scoped>
.scene {
  position: relative;
  min-height: 640px;
  overflow: hidden;
  color: #e8eefc;
  background: linear-gradient(180deg, #0b1026 0%, #1b2350 55%, #3a3f78 100%);
  font-family: system-ui, sans-serif;
}
.star {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  animation: twinkle 3s infinite;
}
@keyframes twinkle {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}
.nav {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 24px 24px 0;
  padding: 12px 24px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.brand {
  letter-spacing: 1px;
}
.nav-item {
  opacity: 0.8;
}
.mountains {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 200px;
}
.center {
  position: relative;
  display: grid;
  place-items: center;
  padding: 56px 0;
}
.card {
  width: 380px;
  max-width: calc(100% - 32px);
  padding: 32px;
  border-radius: 12px;
  color: #1c2033;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
}
.card.shaking {
  animation: hc-shake 0.5s;
}
@keyframes hc-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-10px) rotate(-1deg);
  }
  40% {
    transform: translateX(9px) rotate(1deg);
  }
  60% {
    transform: translateX(-6px);
  }
  80% {
    transform: translateX(4px);
  }
}
</style>
