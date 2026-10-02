<script setup lang="ts">
// CSV/TSV のテスト結果とカバレッジ (pnpm csv:report が書いた JSON をそのまま描く)。
import {
  COVERAGE_METRICS,
  CSV_REPORT as r,
  CSV_TEST_FILE_LABELS,
  CSV_TEST_FILES,
  formatReportTime,
  groupTests,
} from "@demo-data"

const ok = r.totals.failed === 0
const rows = [...r.coverage.files, { file: "合計", ...r.coverage.total }]
const passedIn = (f: (typeof r.files)[number]) =>
  f.tests.filter((t) => t.status === "passed").length
</script>

<template>
  <div class="d-flex flex-column ga-6">
    <div class="d-flex flex-wrap align-center ga-2">
      <v-chip :color="ok ? 'success' : 'error'" variant="flat">
        {{
          ok
            ? `✅ ${r.totals.passed} / ${r.totals.tests} 件すべて成功`
            : `❌ ${r.totals.failed} 件失敗`
        }}
      </v-chip>
      <v-chip variant="outlined">
        カバレッジ 行 {{ r.coverage.total.lines.pct }}% ・ 分岐 {{ r.coverage.total.branches.pct }}%
      </v-chip>
      <v-chip variant="outlined"
        >{{ r.totals.files }} ファイル ・ {{ r.totals.durationMs }} ms</v-chip
      >
      <span class="text-body-2 text-medium-emphasis">
        {{ formatReportTime(r.generatedAt) }} に実行 (commit {{ r.commit
        }}{{ r.dirty ? " + 未コミットの変更" : "" }})
      </span>
    </div>

    <div>
      <div class="text-h6 mb-2">カバレッジ (本体のコード)</div>
      <v-card border flat>
        <v-table density="compact">
          <thead>
            <tr>
              <th>ファイル</th>
              <th v-for="m in COVERAGE_METRICS" :key="m.key">{{ m.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in rows" :key="f.file">
              <td :class="{ 'font-weight-bold': f.file === '合計' }">{{ f.file }}</td>
              <td v-for="m in COVERAGE_METRICS" :key="m.key" style="min-width: 120px">
                <div class="text-body-2">
                  {{ f[m.key].pct }}% ({{ f[m.key].covered }}/{{ f[m.key].total }})
                </div>
                <v-progress-linear
                  :model-value="f[m.key].pct"
                  :color="f[m.key].pct === 100 ? 'success' : 'warning'"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <div>
      <div class="text-h6 mb-2">テストの一覧</div>
      <v-expansion-panels multiple variant="accordion">
        <v-expansion-panel v-for="f in CSV_TEST_FILES" :key="f.file">
          <v-expansion-panel-title>
            <div>
              <div class="font-weight-bold">
                {{ passedIn(f) === f.tests.length ? "✅" : "❌" }}
                {{ CSV_TEST_FILE_LABELS[f.file] ?? f.file }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                {{ f.file }} ・ {{ passedIn(f) }} / {{ f.tests.length }} 件
              </div>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div v-for="g in groupTests(f.tests)" :key="g.title" class="mb-4">
              <div class="text-subtitle-2 mb-1">{{ g.title }}</div>
              <div v-for="t in g.items" :key="t.title" class="text-body-2 pl-4">
                {{ t.status === "passed" ? "✓" : "✗" }} {{ t.title }}
                <div v-if="t.failure" class="text-error pl-4">{{ t.failure }}</div>
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
  </div>
</template>
