<script setup lang="ts">
import JigsawPuzzle from "@/components/draft/effects/JigsawPuzzle.vue"
// 包んだページをジグソーパズルのピースに切り分けて散らす。元の位置に戻すとはまる。
// seed で散らし方を固定 (省略すると毎回ちがう)。sound ではまるときに合成音を鳴らす。
</script>

<template>
  <JigsawPuzzle :rows="4" :cols="6" :seed="42" sound @solved="() => console.log('solved! 🎉')">
    <slot />
  </JigsawPuzzle>
</template>
