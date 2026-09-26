<script lang="ts">
export const meta = { slug: "jigsaw", label: "🧩 ジグソー", order: 1 }
</script>

<script setup lang="ts">
import { JigsawPuzzle } from "@hc/vuetify"
import DemoPage from "./DemoPage.vue"

const on = () => console.log("solved! 🎉")
</script>

<template>
  <JigsawPuzzle :rows="4" :cols="6" @solved="on">
    <DemoPage hint="ピースをドラッグして元の位置に戻すと、カチッとはまります。" />
  </JigsawPuzzle>
</template>
