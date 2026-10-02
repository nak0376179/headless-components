<script setup lang="ts">
import ShatterGlass from "@/components/draft/effects/ShatterGlass.vue"
import DemoPage from "@/demo/DemoPage.vue"

const on = () => console.log("smash! 💥")
</script>

<template>
  <ShatterGlass @shatter="on">
    <DemoPage hint="どこかをクリックすると、その場所からガラスのように割れます。" />
  </ShatterGlass>
</template>
