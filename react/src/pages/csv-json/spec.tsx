import { CSV_SPEC_HTML } from "@demo-data"
import { MarkdownDoc } from "@/demo/MarkdownDoc"

/** 詳しい仕様 (utils/src/csv-json/SPEC.md。別チームへ渡すものと同じ文書)。 */
export default function CsvSpecPage() {
  return <MarkdownDoc html={CSV_SPEC_HTML} />
}
