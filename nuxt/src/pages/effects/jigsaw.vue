<script setup lang="ts">
import JigsawPuzzle from "@/components/draft/effects/JigsawPuzzle.vue"
import DemoPage from "@/demo/DemoPage.vue"

const on = () => console.log("solved! 🎉")
</script>

<template>
  <JigsawPuzzle :rows="4" :cols="6" @solved="on">
    <DemoPage hint="ピースをドラッグして元の位置に戻すと、カチッとはまります。" />
  </JigsawPuzzle>
</template>
