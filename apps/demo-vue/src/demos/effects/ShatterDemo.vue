<script lang="ts">
export const meta = { slug: "shatter", label: "💥 ガラス割れ", order: 2 }
</script>

<script setup lang="ts">
import { ShatterGlass } from "@hc/vuetify"
import DemoPage from "./DemoPage.vue"

const on = () => console.log("smash! 💥")
</script>

<template>
  <ShatterGlass @shatter="on">
    <DemoPage hint="どこかをクリックすると、その場所からガラスのように割れます。" />
  </ShatterGlass>
</template>
