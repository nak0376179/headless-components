<script setup lang="ts">
import { Pixelate } from "@hc/vuetify"
// ページ全体をモザイクにし、ポインターの下だけ円形のレンズでくっきり見せる。
// 中身はライブ DOM のままなので、レンズ越しにボタンなどを操作できる。
</script>

<template>
  <Pixelate :size="14" :lens-radius="90">
    <slot />
  </Pixelate>
</template>
