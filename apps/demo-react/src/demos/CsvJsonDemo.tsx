import { useRef, useState } from "react"
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import { CsvJsonTextArea, type CsvJsonTextAreaHandle } from "@hc/mui"
import { demoColumns, demoSamples, usageLabel, type DemoSample } from "@hc/demo-data"

export function CsvJsonDemo() {
  const area = useRef<CsvJsonTextAreaHandle>(null)
  const [active, setActive] = useState<DemoSample | null>(null)

  const load = (sample: DemoSample) => {
    setActive(sample)
    area.current?.setText(sample.text)
    area.current?.convert()
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 820 }}>
      <Typography variant="body2" color="text.secondary">
        CSV や TSV（Excel からのコピペ）を貼り付けて「変換」を押すと、列定義に従って検証し、JSON /
        CSV / TSV
        に変換します。ヘッダ・各セルの前後の空白（半角・全角スペース）は自動で取り除きます。エラーは
        行番号・項目名つきで最大 10 件まで表示します。
      </Typography>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>項目名</TableCell>
              <TableCell>キー</TableCell>
              <TableCell>扱い</TableCell>
              <TableCell>文字数</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {demoColumns.map((c) => (
              <TableRow key={c.key}>
                <TableCell>{c.label}</TableCell>
                <TableCell>
                  <code>{c.key}</code>
                </TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" label={usageLabel[c.usage]} />
                </TableCell>
                <TableCell>
                  {c.minLength || c.maxLength
                    ? `${c.minLength ?? 0}〜${c.maxLength ?? ""}文字`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="body2" color="text.secondary">
        サンプルを選ぶと、読み込んでそのまま変換します:
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        {demoSamples.map((s) => (
          <Button
            key={s.label}
            size="small"
            variant={active?.label === s.label ? "contained" : "outlined"}
            onClick={() => load(s)}
          >
            {s.label}
          </Button>
        ))}
      </Stack>
      {active && (
        <Alert severity="info">
          <strong>{active.label}</strong> — {active.description}
        </Alert>
      )}

      <CsvJsonTextArea ref={area} columns={demoColumns} />
    </Stack>
  )
}
