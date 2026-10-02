import type { MouseEvent } from "react"
import { useNavigate } from "react-router"
import { Box } from "@mui/material"
import { MARKDOWN_CSS } from "@demo-data"

/** Markdown を HTML にした文書を描く (中身は utils の README.md・SPEC.md。自前の文書なので HTML をそのまま入れる)。 */
export function MarkdownDoc({ html }: { html: string }) {
  const navigate = useNavigate()
  // 文書の中のページへのリンク (href="#nav:/csv-json/spec") はルーターで開く (置き場のパスの下でも動くように)
  const onClick = (e: MouseEvent) => {
    const href = (e.target as HTMLElement).closest("a")?.getAttribute("href")
    if (href?.startsWith("#nav:")) {
      e.preventDefault()
      navigate(href.slice("#nav:".length))
    }
  }
  return (
    <Box className="hc-md" onClick={onClick}>
      <style>{MARKDOWN_CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </Box>
  )
}
