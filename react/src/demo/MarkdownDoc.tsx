import { Box } from "@mui/material"
import { MARKDOWN_CSS } from "@demo-data"

/** Markdown を HTML にした文書を描く (中身は utils の README.md・SPEC.md。自前の文書なので HTML をそのまま入れる)。 */
export function MarkdownDoc({ html }: { html: string }) {
  return (
    <Box className="hc-md">
      <style>{MARKDOWN_CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </Box>
  )
}
