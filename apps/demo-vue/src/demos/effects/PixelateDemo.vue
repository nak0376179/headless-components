<script lang="ts">
export const meta = { slug: "pixelate", label: "🟦 モザイク", order: 4 }
</script>

<script setup lang="ts">
import { Pixelate } from "@hc/vuetify"
import DemoPage from "./DemoPage.vue"
</script>

<template>
  <Pixelate>
    <DemoPage hint="マウスを乗せると、その下だけくっきり見えます。" />
  </Pixelate>
</template>
