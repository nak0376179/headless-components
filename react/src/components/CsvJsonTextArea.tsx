import { forwardRef, useImperativeHandle } from "react"
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import {
  csvJsonErrorHeading,
  csvJsonPlaceholder,
  csvJsonResultHeading,
  OUTPUT_FORMATS,
  type ColumnSpec,
  type ConvertResult,
  type OutputFormat,
} from "@/utils"
import { useCsvJson } from "@/hooks/useCsvJson"

export interface CsvJsonTextAreaProps {
  /** 列定義（日本語の項目名 / JSON キー / バリデーション / 必須・省略可・不要）。 */
  columns: ColumnSpec[]
  /** 変換を実行したときに結果を受け取るコールバック。 */
  onConvert?: (result: ConvertResult) => void
  /** テキストエリアの行数。 */
  rows?: number
  /** 初期の出力形式。 */
  defaultFormat?: OutputFormat
}

export interface CsvJsonTextAreaHandle {
  /** 入力を差し替える (デモのサンプル読み込みなど)。 */
  setText(text: string): void
  convert(): ConvertResult
}

/**
 * CSV/TSV を貼り付けて JSON / CSV / TSV に変換するテキストエリア (MUI)。
 * 状態と変換は @/utils の createCsvJson が持ち、ここは描くだけ。
 */
export const CsvJsonTextArea = forwardRef<CsvJsonTextAreaHandle, CsvJsonTextAreaProps>(
  function CsvJsonTextArea({ columns, onConvert, rows = 8, defaultFormat }, ref) {
    const { state, controller } = useCsvJson({ columns, onConvert, format: defaultFormat })
    const { text, format, result } = state

    useImperativeHandle(ref, () => ({ setText: controller.setText, convert: controller.convert }), [
      controller,
    ])

    return (
      <Stack spacing={2}>
        <TextField
          multiline
          rows={rows}
          value={text}
          onChange={(e) => controller.setText(e.target.value)}
          placeholder={csvJsonPlaceholder(columns)}
          slotProps={{ htmlInput: { "aria-label": "CSV/TSV 入力" } }}
        />
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Button variant="contained" onClick={() => controller.convert()}>
            変換
          </Button>
          <RadioGroup
            row
            value={format}
            onChange={(e) => controller.setFormat(e.target.value as OutputFormat)}
          >
            {OUTPUT_FORMATS.map((f) => (
              <FormControlLabel
                key={f.value}
                value={f.value}
                control={<Radio size="small" />}
                label={f.label}
              />
            ))}
          </RadioGroup>
        </Stack>

        {result && !result.ok && (
          <Alert severity="error">
            <Typography variant="subtitle2">{csvJsonErrorHeading(result.errors)}</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, maxHeight: 240, overflow: "auto" }}>
              {result.errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </Box>
          </Alert>
        )}

        {result?.ok && (
          <Stack spacing={1}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle2">
                {csvJsonResultHeading(result.rows.length, format)}
              </Typography>
              <Button size="small" onClick={() => void controller.copyOutput()}>
                コピー
              </Button>
            </Stack>
            <Box
              component="pre"
              aria-label="変換結果"
              sx={{
                m: 0,
                p: 1.5,
                bgcolor: "action.hover",
                borderRadius: 1,
                fontSize: 13,
                maxHeight: 320,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {result.output}
            </Box>
          </Stack>
        )}
      </Stack>
    )
  },
)
