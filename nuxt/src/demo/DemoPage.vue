<script setup lang="ts">
// 演出系のデモで包む、偽の「実ページ」(本物らしいダッシュボード)。効果に題材を与えるためのもの。
// 中身と CSS は @demo-data にあり、React 版 (DemoPage.tsx) と同じ見た目になる。
import {
  DASH_ACTIVITY,
  DASH_DONUT,
  DASH_KPIS,
  DASH_MONTH_MAX,
  DASH_MONTHS,
  DASH_NAV,
  DASH_ORDERS,
  DASH_SOURCES,
  DEMO_PAGE_CSS,
} from "@demo-data"

defineProps<{ hint: string }>()
</script>

<template>
  <div class="hcdp">
    <!-- テンプレートに <style> は書けないので component で出す (CSS は React 版と共有) -->
    <!-- eslint-disable-next-line vue/no-v-html, vue/no-v-text-v-html-on-component -- 中身は自前の定数。文字のまま入れると SSR で > が &gt; になり CSS が壊れる -->
    <component :is="'style'" v-html="DEMO_PAGE_CSS" />
    <header class="hcdp-top">
      <div class="hcdp-logo">🧩 Acme Dashboard</div>
      <div class="hcdp-search">🔍 注文・顧客・商品を検索</div>
      <div class="hcdp-spacer" />
      <div class="hcdp-bell">🔔<b>3</b></div>
      <div class="hcdp-avatar">佐</div>
    </header>

    <div class="hcdp-body">
      <nav class="hcdp-side">
        <a v-for="(n, i) in DASH_NAV" :key="n" :class="{ on: i === 0 }" href="#" @click.prevent>
          {{ n }}
        </a>
      </nav>

      <main class="hcdp-main">
        <section class="hcdp-hero">
          <div style="flex: 1">
            <h1>おはようございます、佐藤さん ☀️</h1>
            <p>ごく普通のダッシュボード……に見えますよね？ 今月は前月比 +12.4% で推移しています。</p>
          </div>
          <button type="button">レポートを作る</button>
          <button type="button" class="ghost">共有</button>
        </section>

        <section class="hcdp-kpis">
          <div v-for="k in DASH_KPIS" :key="k.label" class="hcdp-card">
            <div class="hcdp-kpi-head">
              <span class="hcdp-kpi-icon" :style="{ background: `${k.color}1f` }">{{
                k.icon
              }}</span>
              {{ k.label }}
            </div>
            <div class="hcdp-kpi-value">{{ k.value }}</div>
            <!-- 解約率は下がる方が良いので、どれも緑 -->
            <div class="hcdp-delta" style="color: #2d8f5a">
              {{ k.up ? "▲" : "▼" }} {{ k.delta }}
              <span style="color: #8a90a6; font-weight: 400">前月比</span>
            </div>
            <svg viewBox="0 0 120 32" width="100%" height="32" aria-hidden="true">
              <path :d="`${k.spark} L120,32 L0,32 Z`" :fill="`${k.color}22`" />
              <path :d="k.spark" fill="none" :stroke="k.color" stroke-width="2" />
            </svg>
          </div>
        </section>

        <section class="hcdp-row">
          <div class="hcdp-card">
            <div class="hcdp-title">
              <h2>月別の売上</h2>
              <span>単位: 百万円 ・ 2026 年</span>
            </div>
            <div class="hcdp-bars">
              <div
                v-for="[m, v] in DASH_MONTHS"
                :key="m"
                :class="['hcdp-bar', { max: v === DASH_MONTH_MAX }]"
              >
                <span>{{ v }}</span>
                <i :style="{ height: `${(v / DASH_MONTH_MAX) * 75}%` }" />
                <span>{{ m }}</span>
              </div>
            </div>
          </div>
          <div class="hcdp-card">
            <div class="hcdp-title">
              <h2>流入元</h2>
              <span>直近 30 日</span>
            </div>
            <div class="hcdp-donut">
              <svg viewBox="0 0 100 100" width="130" height="130" aria-hidden="true">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#eef0f5" stroke-width="14" />
                <circle
                  v-for="p in DASH_DONUT"
                  :key="p.color"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  :stroke="p.color"
                  stroke-width="14"
                  :stroke-dasharray="p.dash"
                  :stroke-dashoffset="p.offset"
                  transform="rotate(-90 50 50)"
                />
                <text
                  x="50"
                  y="47"
                  text-anchor="middle"
                  font-size="12"
                  font-weight="800"
                  fill="#1c2033"
                >
                  39.2k
                </text>
                <text x="50" y="61" text-anchor="middle" font-size="7" fill="#8a90a6">訪問</text>
              </svg>
              <div class="hcdp-legend">
                <div v-for="s in DASH_SOURCES" :key="s.label">
                  <span :style="{ background: s.color }" />{{ s.label }}
                  <strong>{{ s.value }}%</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="hcdp-row">
          <div class="hcdp-card">
            <div class="hcdp-title">
              <h2>最近の注文</h2>
              <span>すべて見る →</span>
            </div>
            <table class="hcdp-table">
              <thead>
                <tr>
                  <th>注文</th>
                  <th>顧客</th>
                  <th>内容</th>
                  <th>金額</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in DASH_ORDERS" :key="o.id">
                  <td>{{ o.id }}</td>
                  <td>{{ o.customer }}</td>
                  <td>{{ o.item }}</td>
                  <td>{{ o.amount }}</td>
                  <td>
                    <span class="hcdp-pill" :style="{ color: o.color, background: `${o.color}1a` }">
                      {{ o.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="hcdp-card">
            <div class="hcdp-title">
              <h2>アクティビティ</h2>
              <span>今日</span>
            </div>
            <div v-for="a in DASH_ACTIVITY" :key="a.what" class="hcdp-act">
              <div class="hcdp-dot" :style="{ background: a.color }">{{ a.who[0] }}</div>
              <div>
                <div>
                  <strong>{{ a.who }}</strong> が{{ a.what }}
                </div>
                <small>{{ a.when }}</small>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <footer class="hcdp-foot">© 2026 Acme Inc. — {{ hint }}</footer>
  </div>
</template>
