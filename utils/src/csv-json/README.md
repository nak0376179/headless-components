# CSV/TSV → JSON 変換 (csv-json)

Excel などから貼り付けた CSV / TSV を、**列定義に従って検証し、JSON / CSV / TSV に変換する**ロジック。
画面の部品は含まない (UI ライブラリに依存しない) ので、**React / Next.js / Vue / Nuxt のどれでも同じものを使える**。

細かい仕様は [SPEC.md](SPEC.md)。下の「できること」の例は `readme.test.ts` でそのまま確かめている。

## できること

例はすべて次の列定義で、`convertDelimitedText(テキスト, columns)` を呼んだ結果。

```ts
const columns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required", maxLength: 10 },
  { label: "メールアドレス", key: "email", usage: "required", validate: email() },
  { label: "年齢", key: "age", usage: "optional", validate: numeric() },
  {
    label: "郵便番号",
    key: "zip",
    usage: "optional",
    validate: combine(hankaku(), pattern(/^\d{3}-\d{4}$/, "123-4567 の形で入力してください")),
  },
  { label: "メモ", key: "memo", usage: "unused" },
]
```

### 1. 列の並びは自由

1 行目 (ヘッダ) の**項目名で列を突き合わせる**ので、列の順番は問わない。任意の列はヘッダごと無くてもよい
(出力では `""`)。出力のキーは入力の順ではなく**列定義の順**に並ぶ。
区切りは、ヘッダにタブがあれば TSV (Excel のコピペ)、なければ CSV (カンマ) とみなす。

```text
メールアドレス,氏名
taro@example.com,山田太郎
→ [{ "name": "山田太郎", "email": "taro@example.com", "age": "", "zip": "" }]
```

### 2. 前後の空白を取り除く (trim)

ヘッダも各セルも、**前後の空白を取り除いてから**扱う。全角スペース (`U+3000`) も対象。**途中の空白は残す**。
目に見えないゼロ幅文字 (ゼロ幅スペースなど。Web からのコピーで混じる) は、途中にあっても取り除く。
空白だけのセルは空とみなす (必須ならエラー、任意なら `""`)。

```text
 氏名 ,メールアドレス
　山田 太郎　, taro@example.com
→ name: "山田 太郎" / email: "taro@example.com"
```

### 3. 必須・任意・不要の列

| `usage`      | ヘッダ                      | 値         | 出力                 |
| ------------ | --------------------------- | ---------- | -------------------- |
| `"required"` | 必要 (無ければヘッダエラー) | 空はエラー | 出す                 |
| `"optional"` | 無くてよい                  | 空でよい   | 出す (無ければ `""`) |
| `"unused"`   | あってもよい                | 検査しない | **出さない**         |

```text
メールアドレス            → ヘッダ: 必須項目「氏名」がありません
氏名,メールアドレス
　,taro@example.com      → 2行目: 「氏名」は必須です
```

ヘッダに**列定義に無い項目名**・**重複した項目名**・**空の項目名**があってもエラーになる。

### 4. 検査を重ねる (複数のバリデーション)

1 つの列に、**必須 → カンマ → 文字数 (`minLength` / `maxLength`) → `validate`** の順で検査をかけられる。
`validate` に複数の検査を重ねるときは `combine(検査1, 検査2, …)`。前から順に当て、**最初に引っかかった理由**を返す。
カンマ・文字数・`validate` は値が空でないときだけ当てる (任意の列が空なら検査しない)。文字数はコードポイントで数える (絵文字も 1 文字)。

**値に半角カンマ `,` は入れられない**。TSV でも、CSV で引用符に包んでもエラーになる (全角の「，」「、」は通す)。

```text
氏名	メールアドレス	備考
山田太郎	taro@example.com	東京,大阪   → 2行目: 「備考」にカンマ（,）は使えません
```

```text
氏名,メールアドレス,郵便番号
山田太郎山田太郎山田太郎,taro@example.com,   → 2行目: 「氏名」は10文字以内で入力してください（現在12文字）
山田太郎,taro@example.com,１２３-４５６７     → 3行目: 「郵便番号」が不正です（半角で入力してください）
山田太郎,taro@example.com,1234567             → 4行目: 「郵便番号」が不正です（123-4567 の形で入力してください）
```

用意している検査 (`validators.ts`。どれも引数でエラーの文言を変えられる):

| 検査                        | 内容                        |
| --------------------------- | --------------------------- |
| `email()`                   | メールアドレスの形式        |
| `numeric()`                 | 半角数字だけ                |
| `zenkaku()`                 | 全角を含む (半角の混在は可) |
| `hankaku()`                 | 半角だけ                    |
| `zenkakuKatakana()`         | 全角カタカナ (と長音符)     |
| `hiragana()`                | ひらがな (と長音符)         |
| `oneOf(["A", "B"])`         | 候補のどれか                |
| `pattern(/正規表現/, 文言)` | 正規表現に合う              |
| `combine(検査…)`            | 複数の検査を順に当てる      |

自前の検査は `(value: string) => string | null` (エラーなら理由、問題なければ `null`) を書いて `validate` に渡す。

### 5. エラーをまとめて返す (上限 10 件)

エラーが 1 件でもあれば変換結果は返さず、**全部の行・列を検査してエラーを集めて返す**。
**1 セルにつき 1 件**、1 行の中で複数の列が誤っていれば列ごとに返す。全体で **`MAX_ERRORS` (10) 件**に達したら打ち切る。
各エラーは行番号 (`row`)・項目名 (`label`)・表示用の文 (`message`) を持つ。

```text
氏名,メールアドレス,年齢
,taro,三十
→ 2行目: 「氏名」は必須です
  2行目: 「メールアドレス」が不正です（メールアドレスの形式ではありません）
  2行目: 「年齢」が不正です（数値で入力してください）
```

- ヘッダに誤りがあれば、データ行は検査しない (ヘッダのエラーだけ返す)。
- 列の数が足りない・多すぎる行もエラー。空行は読み飛ばし、行番号は貼り付けたテキストの行のまま数える。

### 6. 出力の形式

`"json"` (既定。2 スペースの字下げ) / `"csv"` / `"tsv"`。CSV / TSV では、カンマ・引用符・改行を含む値は引用符で囲む。
結果は文字列 (`output`) と、オブジェクトの配列 (`rows`) の両方で返る。

### 7. 日本語の入力

Excel・Web・メールからのコピーを想定して確かめている (`japanese.test.ts`)。**文字の変換 (全角 → 半角など) はしない**。

- Excel のコピー (タブ区切り・CRLF・セル内の改行)、UTF-8 の BOM 付き、全角スペースの trim はそのまま扱える
- 半角カンマは値に使えない (TSV でもエラー)。全角の読点「、」・カンマ「，」は通す。「𠮷」のような漢字も 1 文字と数える。機種依存文字 (①・㈱・髙) も通る
- 全角数字「３０」は `numeric()`、半角カナ「ﾔﾏﾀﾞ」とフリガナの空白「ヤマダ　タロウ」は `zenkakuKatakana()` で弾く
- 項目名は全角・半角を区別する。濁点が分かれた文字 (NFD) は 2 文字と数える
- Web からのコピーで混じる見えないゼロ幅文字 (ゼロ幅スペースなど) は、値の途中からも取り除く

一覧は [SPEC.md の「日本語の入力について」](SPEC.md#日本語の入力について)。

## 組み込み方

1. この `utils` フォルダをアプリの `src/utils/` に置く (Nuxt 4 の既定の構成なら `app/utils/`)。
2. 依存を 1 つ入れる (CSV の解析に使う):

   ```bash
   npm install papaparse
   npm install -D @types/papaparse
   ```

3. `@/utils` で import する。`@` → `src` の別名は Vite・Next.js・Nuxt の雛形に最初からある
   (無ければ tsconfig の `paths` に `"@/*": ["./src/*"]`、Vite なら `resolve.alias` にも足す)。

```ts
import { convertDelimitedText, createCsvJson, email, type ColumnSpec } from "@/utils"
```

- `strict` で書いてあり、TypeScript 5・6・7 のどれでも型検査が通る (書き出すときに 3 つとも確かめている)。ブラウザでもサーバー (Node・SSR) でも動く
  (`copyOutput()` だけはブラウザのクリップボードを使う)。
- 中のファイルどうしは相対パスで参照しているので、フォルダの名前や置き場所を変えても動く (そのときは import の書き方を合わせる)。
- **Nuxt** では `utils/` の中身が自動 import の対象になる (`createCsvJson` などを import なしで書ける)。
  アプリの関数と名前がぶつかるときは import を明示する。

## 呼び出し方

### A. 関数 1 つで変換する

画面を持たない処理 (送信前の検査・テスト・サーバー側) なら `convertDelimitedText` だけでよい。

<!-- file: react/src/demo/usage/csv-json/core-only.ts -->

```ts
import { convertDelimitedText, type ColumnSpec } from "@/utils"

// UI なしで変換だけ (サーバーへ送る前の検査・テストなど)。区切りは CSV / TSV を自動判定する。
const columns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required", maxLength: 20 },
  { label: "メールアドレス", key: "email", usage: "required" },
]

const tsv = ["氏名\tメールアドレス", "山田 太郎\tyamada@example.com"].join("\n")
const result = convertDelimitedText(tsv, columns, "json")

if (result.ok) {
  console.log(result.rows) // [{ name: "山田 太郎", email: "yamada@example.com" }]
  console.log(result.output) // 整形済みの JSON 文字列 (format に "csv" / "tsv" も指定できる)
} else {
  for (const e of result.errors) console.log(e.row, e.label, e.message)
}
```

<!-- /file -->

### B. 入力画面を作る

`createCsvJson` が入力テキスト・出力形式・変換結果を持つ (`get()` で今の状態、`subscribe()` で変更の通知)。
画面はこの状態を描いて、`setText` / `setFormat` / `convert` を呼ぶだけ。

列定義の例 (下の画面の例で使っている):

<!-- file: react/src/demo/usage/csv-json/columns.ts -->

```ts
import { combine, email, numeric, oneOf, pattern, zenkakuKatakana, type ColumnSpec } from "@/utils"

// 列定義は UI に依らない (React でも Vue でも同じ物を渡す)。
// label = 貼り付けるデータのヘッダ (日本語の項目名) / key = 変換後の JSON のキー。
// 列の並び順は自由。ヘッダとセルの前後の空白 (全角スペースも) は自動で取り除く。
export const columns: ColumnSpec[] = [
  // 必須・20 文字以内 (文字数はコードポイントで数える)
  { label: "氏名", key: "name", usage: "required", maxLength: 20 },
  // 省略可。値があるときだけ検査する
  { label: "フリガナ", key: "kana", usage: "optional", validate: zenkakuKatakana() },
  { label: "メールアドレス", key: "email", usage: "required", maxLength: 100, validate: email() },
  { label: "年齢", key: "age", usage: "optional", validate: numeric() },
  // 候補のどれか
  {
    label: "雇用形態",
    key: "employment",
    usage: "optional",
    validate: oneOf(["正社員", "契約", "派遣"]),
  },
  // 複数の検査を順に当て、最初に引っかかった理由を出す
  {
    label: "社員番号",
    key: "code",
    usage: "required",
    validate: combine(numeric(), pattern(/^\d{6}$/, "6 桁の数字で入力してください")),
  },
  // 入力にあっても出力から項目ごと消す
  { label: "メモ", key: "memo", usage: "unused" },
]
```

<!-- /file -->

#### React / Next.js

`useSyncExternalStore` で購読する。Next.js の App Router ではファイルの先頭に `"use client"` を書く。

<!-- file: react/src/demo/usage/csv-json/plain.tsx -->

```tsx
"use client" // Next.js (App Router) で使うときに要る。Vite などの React では無くてよい
import { useState, useSyncExternalStore } from "react"
import { createCsvJson, csvJsonErrorHeading, csvJsonPlaceholder, OUTPUT_FORMATS } from "@/utils"
import { columns } from "./columns"

// utils だけで作る CSV/TSV の取り込み画面 (React / Next.js)。UI ライブラリは使わない。
// 状態は createCsvJson が持つので、React は useSyncExternalStore で購読して描くだけ。
export function CsvImport() {
  const [csv] = useState(() => createCsvJson({ columns }))
  const { text, format, result } = useSyncExternalStore(csv.subscribe, csv.get, csv.get)

  return (
    <div>
      <textarea
        rows={8}
        cols={80}
        value={text}
        placeholder={csvJsonPlaceholder(columns)}
        onChange={(e) => csv.setText(e.target.value)}
      />
      <div>
        {OUTPUT_FORMATS.map((f) => (
          <label key={f.value}>
            <input
              type="radio"
              checked={format === f.value}
              onChange={() => csv.setFormat(f.value)}
            />
            {f.label}
          </label>
        ))}
        <button onClick={() => csv.convert()}>変換</button>
      </div>
      {result && !result.ok && (
        <div role="alert">
          <p>{csvJsonErrorHeading(result.errors)}</p>
          <ul>
            {result.errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
      {result?.ok && <pre>{result.output}</pre>}
    </div>
  )
}
```

<!-- /file -->

#### Vue / Nuxt

`shallowRef` に写して描く。購読は `onScopeDispose` で外れる。

<!-- file: nuxt/src/demo/usage/csv-json/Plain.vue -->

```vue
<script setup lang="ts">
// utils だけで作る CSV/TSV の取り込み画面 (Vue / Nuxt)。UI ライブラリは使わない。
// 状態は createCsvJson が持つので、Vue は shallowRef に写して描くだけ。
import { onScopeDispose, shallowRef } from "vue"
import { createCsvJson, csvJsonErrorHeading, csvJsonPlaceholder, OUTPUT_FORMATS } from "@/utils"
import { columns } from "./columns"

const csv = createCsvJson({ columns })
const state = shallowRef(csv.get())
onScopeDispose(csv.subscribe(() => (state.value = csv.get())))
</script>

<template>
  <div>
    <textarea
      rows="8"
      cols="80"
      :value="state.text"
      :placeholder="csvJsonPlaceholder(columns)"
      @input="csv.setText(($event.target as HTMLTextAreaElement).value)"
    />
    <div>
      <label v-for="f in OUTPUT_FORMATS" :key="f.value">
        <input type="radio" :checked="state.format === f.value" @change="csv.setFormat(f.value)" />
        {{ f.label }}
      </label>
      <button @click="csv.convert()">変換</button>
    </div>
    <div v-if="state.result && !state.result.ok" role="alert">
      <p>{{ csvJsonErrorHeading(state.result.errors) }}</p>
      <ul>
        <li v-for="(e, i) in state.result.errors" :key="i">{{ e.message }}</li>
      </ul>
    </div>
    <pre v-if="state.result?.ok">{{ state.result.output }}</pre>
  </div>
</template>
```

<!-- /file -->

見出しや文言は `csvJsonErrorHeading` (「エラーが 3件 あります」)・`csvJsonResultHeading`
(「変換結果（2件・JSON）」)・`csvJsonPlaceholder` (入力欄の例) を使うと、どの画面でも同じ言い回しになる。

## 型

```ts
interface ColumnSpec {
  label: string // 貼り付けるデータのヘッダに現れる項目名
  key: string // 変換後のキー
  usage: "required" | "optional" | "unused"
  minLength?: number // 空でない値にだけ当てる
  maxLength?: number // 空でない値にだけ当てる
  validate?: (value: string) => string | null // 空でない値にだけ当てる。エラーなら理由を返す
}

type ConvertResult =
  | { ok: true; rows: Record<string, string>[]; output: string }
  | { ok: false; errors: ConvertError[] }

interface ConvertError {
  row: number | null // 貼り付けたテキストの行番号 (ヘッダのエラーは null)
  label: string | null // 項目名 (列を特定できないときは null)
  message: string // 表示用の文 (行番号・項目名を含む)
}
```

## API

| 名前                                                                  | 内容                                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `convertDelimitedText(text, columns, format = "json")`                | 検証して変換する。`ConvertResult` を返す                                                                      |
| `createCsvJson({ columns, text?, format?, onConvert? })`              | 入力画面の状態を持つ。`get` / `subscribe` / `setText` / `setFormat` / `setColumns` / `convert` / `copyOutput` |
| `MAX_ERRORS`                                                          | 返すエラーの上限 (10)                                                                                         |
| `OUTPUT_FORMATS`                                                      | 出力形式の選択肢 (`json` / `csv` / `tsv` と表示名)                                                            |
| `csvJsonErrorHeading` / `csvJsonResultHeading` / `csvJsonPlaceholder` | 画面の見出し・入力欄の例の文言                                                                                |
| 検査 (`email` など)                                                   | 上の「4. 検査を重ねる」の表                                                                                   |
| `createStore`                                                         | `createCsvJson` が使っている小さなストア (`get` / `subscribe` / `set` / `patch`)                              |

## テスト

`*.test.ts` は [Vitest](https://vitest.dev/) で書いてある (`npm install -D vitest` → `npx vitest run src/utils`)。

| ファイル             | 確かめていること                                                      |
| -------------------- | --------------------------------------------------------------------- |
| `readme.test.ts`     | この README の「できること」の例                                      |
| `japanese.test.ts`   | 日本語の入力で起きやすいこと (全角・半角カナ・BOM・Excel のコピペ…)   |
| `convert.test.ts`    | [SPEC.md](SPEC.md) の挙動 (並び順・trim・必須・文字数・ヘッダ・上限…) |
| `validators.test.ts` | 用意している検査                                                      |
| `controller.test.ts` | `createCsvJson` (入力画面の状態)                                      |

Jest で流すなら、各ファイル先頭の `from "vitest"` の行を消し (Jest のグローバルの `describe` / `it` / `expect` を使う)、
`vi.fn()` を `jest.fn()` に置き換える。テストを使わないなら `*.test.ts` は消してよい。
