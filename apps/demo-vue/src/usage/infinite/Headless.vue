<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { createMemorySource, virtualWindow } from "@hc/core"
import { useInfiniteList } from "@hc/vue"

type Message = { id: string; text: string }
const source = createMemorySource<Message>({
  items: Array.from({ length: 5000 }, (_, i) => ({ id: String(i), text: `メッセージ ${i + 1}` })),
  getKey: (m) => m.id,
})

const ROW = 56 // 1 行の高さ (一定)

// 表ではないリストにも同じ仕組みを付けられる: 読み込みは useInfiniteList、描く範囲は virtualWindow。
const { state, controller } = useInfiniteList({ fetchPage: source.fetchPage, pageSize: 200 })
const top = ref(0)
const win = computed(() =>
  virtualWindow({
    scrollTop: top.value,
    viewportHeight: 480,
    rowHeight: ROW,
    count: state.value.items.length,
  }),
)

// 下端まで残り 40 行を切ったら続きを読む (loadMore は二重には走らない)
watch(
  () => win.value.rowsBelow,
  (below) => {
    if (below < 40) void controller.loadMore()
  },
  { immediate: true },
)
</script>

<template>
  <div
    style="height: 480px; overflow: auto"
    @scroll="top = ($event.target as HTMLElement).scrollTop"
  >
    <div :style="{ height: `${win.padTop}px` }" />
    <div
      v-for="m in state.items.slice(win.start, win.end)"
      :key="m.id"
      :style="{ height: `${ROW}px` }"
    >
      {{ m.text }}
    </div>
    <div :style="{ height: `${win.padBottom}px` }" />
    <p v-if="state.loading">読み込み中…</p>
  </div>
</template>
