import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import {
  COVERAGE_METRICS,
  CSV_REPORT as r,
  CSV_TEST_FILE_LABELS,
  CSV_TEST_FILES,
  formatReportTime,
  groupTests,
} from "@demo-data"

/** CSV/TSV のテスト結果とカバレッジ (pnpm csv:report が書いた JSON をそのまま描く)。 */
export default function CsvTestsPage() {
  const ok = r.totals.failed === 0
  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center", rowGap: 1 }}>
        <Chip
          color={ok ? "success" : "error"}
          label={
            ok
              ? `✅ ${r.totals.passed} / ${r.totals.tests} 件すべて成功`
              : `❌ ${r.totals.failed} 件失敗`
          }
        />
        <Chip
          variant="outlined"
          label={`カバレッジ 行 ${r.coverage.total.lines.pct}% ・ 分岐 ${r.coverage.total.branches.pct}%`}
        />
        <Chip
          variant="outlined"
          label={`${r.totals.files} ファイル ・ ${r.totals.durationMs} ms`}
        />
        <Typography variant="body2" color="text.secondary">
          {formatReportTime(r.generatedAt)} に実行 (commit {r.commit}
          {r.dirty ? " + 未コミットの変更" : ""})
        </Typography>
      </Stack>

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          カバレッジ (本体のコード)
        </Typography>
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ファイル</TableCell>
                {COVERAGE_METRICS.map((m) => (
                  <TableCell key={m.key}>{m.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[...r.coverage.files, { file: "合計", ...r.coverage.total }].map((f) => (
                <TableRow key={f.file}>
                  <TableCell sx={{ fontWeight: f.file === "合計" ? 700 : 400 }}>{f.file}</TableCell>
                  {COVERAGE_METRICS.map((m) => (
                    <TableCell key={m.key} sx={{ minWidth: 120 }}>
                      <Typography variant="body2">
                        {f[m.key].pct}% ({f[m.key].covered}/{f[m.key].total})
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={f[m.key].pct}
                        color={f[m.key].pct === 100 ? "success" : "warning"}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          テストの一覧
        </Typography>
        {CSV_TEST_FILES.map((f) => {
          const passed = f.tests.filter((t) => t.status === "passed").length
          return (
            <Accordion key={f.file} disableGutters variant="outlined">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack>
                  <Typography sx={{ fontWeight: 600 }}>
                    {passed === f.tests.length ? "✅" : "❌"}{" "}
                    {CSV_TEST_FILE_LABELS[f.file] ?? f.file}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {f.file} ・ {passed} / {f.tests.length} 件
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                {groupTests(f.tests).map((g) => (
                  <Box key={g.title} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      {g.title}
                    </Typography>
                    {g.items.map((t) => (
                      <Typography key={t.title} variant="body2" sx={{ pl: 2 }}>
                        {t.status === "passed" ? "✓" : "✗"} {t.title}
                        {t.failure && (
                          <Box
                            component="span"
                            sx={{ color: "error.main", display: "block", pl: 2 }}
                          >
                            {t.failure}
                          </Box>
                        )}
                      </Typography>
                    ))}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Box>
    </Stack>
  )
}
