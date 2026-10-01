<script setup lang="ts">
import ShatterGlass from "@/components/effects/ShatterGlass.vue"
// クリックした所からガラスのように割る。破片はドラッグでき、「元に戻す」で直る。
</script>

<template>
  <ShatterGlass :spokes="16" :rings="4" :jitter="0.5" @shatter="() => console.log('💥')">
    <slot />
  </ShatterGlass>
</template>
