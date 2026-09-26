<script setup lang="ts">
// 演出系のデモで包む、偽の「実ページ」。効果に題材を与えるためのもの (テーマに依らず元デモと同じ配色)。
import { DEMO_PAGE_CARDS } from "@hc/demo-data"

defineProps<{ hint: string }>()
</script>

<template>
  <div class="page">
    <header class="head">
      <h1>🧩 Acme Dashboard</h1>
      <p>ごく普通のページ……に見えますよね？</p>
    </header>

    <main class="grid">
      <div v-for="[label, value, color] in DEMO_PAGE_CARDS" :key="label" class="card">
        <div class="label">{{ label }}</div>
        <div class="value" :style="{ color }">{{ value }}</div>
        <div class="bar" :style="{ background: `linear-gradient(90deg, ${color}, ${color}33)` }" />
      </div>
    </main>

    <footer class="foot">© 2026 Acme Inc. — {{ hint }}</footer>
  </div>
</template>

<style scoped>
.page {
  font-family: system-ui, sans-serif;
  color: #1c1c1c;
}
.head {
  padding: 28px 32px;
  background: linear-gradient(120deg, #6a5cff, #00c2ff);
  color: #fff;
}
.head h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.2;
}
.head p {
  margin: 6px 0 0;
  opacity: 0.9;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  padding: 32px;
  background: #f4f5f7;
}
.card {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.label {
  font-size: 13px;
  color: #777;
}
.value {
  font-size: 26px;
  font-weight: 700;
}
.bar {
  margin-top: 12px;
  height: 8px;
  border-radius: 4px;
}
.foot {
  padding: 20px 32px;
  background: #22223b;
  color: #cfcfe0;
}
</style>
