import { useState } from "react"
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import CheckIcon from "@mui/icons-material/Check"
import { CODE_TOKEN_COLORS, tokenizeCode, type UsageBlock } from "@hc/demo-data"
import { usageBySlug, VENDOR_BLOCK } from "./index"

/** ページ下部の「コードの使い方」。slug ごとのコード例と、取り込み方を並べる。 */
export function UsageSection({ slug }: { slug: string }) {
  const blocks = usageBySlug[slug]
  if (!blocks) return null
  return (
    <Box component="section" sx={{ mt: 6, pt: 3, borderTop: 1, borderColor: "divider" }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        💻 コードの使い方
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        React + MUI の例。Vue + Vuetify 版は右上の「Vue 版」で同じページを開く。
      </Typography>
      <Stack spacing={3}>
        {[...blocks, VENDOR_BLOCK].map((b) => (
          <CodeBlock key={b.title} block={b} />
        ))}
      </Stack>
    </Box>
  )
}

function CodeBlock({ block }: { block: UsageBlock }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(block.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {block.title}
      </Typography>
      {block.note && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {block.note}
        </Typography>
      )}
      <Paper sx={{ bgcolor: "#0d1117", borderRadius: 2, overflow: "hidden" }} elevation={0}>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 0.5,
            bgcolor: "#161b22",
            color: "#8b949e",
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          <span>{block.file ?? block.lang}</span>
          <Tooltip title={copied ? "コピーしました" : "コピー"}>
            <IconButton size="small" onClick={() => void copy()} sx={{ color: "#8b949e" }}>
              {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            overflowX: "auto",
            fontSize: 13,
            lineHeight: 1.6,
            fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
          }}
        >
          <code>
            {tokenizeCode(block.code.trimEnd(), block.lang).map((t, i) => (
              <span key={i} style={{ color: CODE_TOKEN_COLORS[t.kind] }}>
                {t.text}
              </span>
            ))}
          </code>
        </Box>
      </Paper>
    </div>
  )
}
