<script setup lang="ts">
// ページ下部の「コードの使い方」。slug ごとのコード例と、取り込み方を並べる (React 版と同じ内容)。
import { computed, ref } from "vue"
import { CODE_TOKEN_COLORS, tokenizeCode, type UsageBlock } from "@hc/demo-data"
import { usageBySlug, VENDOR_BLOCK } from "./index"

const props = defineProps<{ slug: string }>()
const blocks = computed<UsageBlock[] | null>(() => {
  const b = usageBySlug[props.slug]
  return b ? [...b, VENDOR_BLOCK] : null
})
const copied = ref<string | null>(null)
const copy = async (b: UsageBlock) => {
  await navigator.clipboard.writeText(b.code)
  copied.value = b.title
  setTimeout(() => (copied.value = null), 1500)
}
</script>

<template>
  <section v-if="blocks" class="usage">
    <h2 class="text-h5 mb-1">💻 コードの使い方</h2>
    <p class="text-body-2 text-medium-emphasis mb-6">
      Vue + Vuetify の例。React + MUI 版は右上の「React 版」で同じページを開く。
    </p>
    <div v-for="b in blocks" :key="b.title" class="mb-6">
      <div class="text-subtitle-1 font-weight-bold">{{ b.title }}</div>
      <p v-if="b.note" class="text-body-2 text-medium-emphasis mb-2">{{ b.note }}</p>
      <div class="code">
        <div class="code-head">
          <span>{{ b.file ?? b.lang }}</span>
          <v-btn
            :icon="copied === b.title ? 'mdi-check' : 'mdi-content-copy'"
            size="x-small"
            variant="text"
            :title="copied === b.title ? 'コピーしました' : 'コピー'"
            @click="copy(b)"
          />
        </div>
        <pre><code><span
          v-for="(t, i) in tokenizeCode(b.code.trimEnd(), b.lang)"
          :key="i"
          :style="{ color: CODE_TOKEN_COLORS[t.kind] }"
        >{{ t.text }}</span></code></pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.usage {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid rgba(128, 128, 128, 0.3);
}
.code {
  background: #0d1117;
  border-radius: 8px;
  overflow: hidden;
}
.code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 8px 2px 16px;
  background: #161b22;
  color: #8b949e;
  font:
    12px ui-monospace,
    monospace;
}
pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  font:
    13px/1.6 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
}
</style>
