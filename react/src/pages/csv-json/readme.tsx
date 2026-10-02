import { CSV_README_HTML } from "@demo-data"
import { MarkdownDoc } from "@/demo/MarkdownDoc"

/** 機能と使い方 (utils/src/csv-json/README.md。別チームへ渡すものと同じ文書)。 */
export default function CsvReadmePage() {
  return <MarkdownDoc html={CSV_README_HTML} />
}
