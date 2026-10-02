<script setup lang="ts">
import { ref } from "vue"
import Snowfall from "@/components/draft/effects/Snowfall.vue"

// ページを包むと雪が降る。data-snow-target を付けた要素の上の縁と、包んだ範囲の底に積もる。
// intensity: 1 秒・幅 1000px あたりの粒の数 / wind: 正で右へ / max-depth: 積もる深さの上限 (px)
const snow = ref<InstanceType<typeof Snowfall> | null>(null)
const card = ref<HTMLElement | null>(null)
// 押すとこの要素の雪だけを払い落とす (省略すると全部)
const shake = () => card.value && snow.value?.controller?.shake(card.value)
</script>

<template>
  <Snowfall ref="snow" :intensity="90" :wind="18" :max-depth="24" :controls="false">
    <slot />
    <div
      ref="card"
      data-snow-target
      style="width: 360px; margin: 80px auto; padding: 32px; background: #fff"
    >
      ここに積もる
      <v-btn @click="shake">払う</v-btn>
      <v-btn @click="snow?.controller?.melt()">溶かす</v-btn>
    </div>
  </Snowfall>
</template>
