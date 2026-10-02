<script setup lang="ts">
import CheatCode from "@/components/draft/effects/CheatCode.vue"
import DemoPage from "@/demo/DemoPage.vue"

const on = () => console.log("unlocked! 🎮")
</script>

<template>
  <CheatCode @unlock="on">
    <DemoPage hint="↑ ↑ ↓ ↓ ← → ← → B A と入力してみてください。" />
  </CheatCode>
</template>
