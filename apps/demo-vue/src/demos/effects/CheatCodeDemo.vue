<script lang="ts">
export const meta = { slug: "cheat-code", label: "🎮 隠しコマンド", order: 3 }
</script>

<script setup lang="ts">
import { CheatCode } from "@hc/vuetify"
import DemoPage from "./DemoPage.vue"

const on = () => console.log("unlocked! 🎮")
</script>

<template>
  <CheatCode @unlock="on">
    <DemoPage hint="↑ ↑ ↓ ↓ ← → ← → B A と入力してみてください。" />
  </CheatCode>
</template>
