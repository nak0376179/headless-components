<script setup lang="ts">
import CheatCode from "@/components/draft/effects/CheatCode.vue"
// ↑↑↓↓←→←→BA (コナミコマンド) を入力すると紙吹雪と秘密のバナーを出す。code を省略するとコナミコマンド。
const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "b", "a"]
</script>

<template>
  <CheatCode :code="code" @unlock="() => console.log('unlocked!')">
    <slot />
    <template #secret="{ close }">
      <strong>🎮 開発チームより愛を込めて</strong>
      <v-btn size="small" @click="close">閉じる</v-btn>
    </template>
  </CheatCode>
</template>
