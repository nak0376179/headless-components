# CSV/TSV → JSON 変換 (csv-json)

Excel などから貼り付けた CSV / TSV を、**列定義に従って検証し、JSON / CSV / TSV に変換する**ロジック。
画面の部品は含まない (UI ライブラリに依存しない) ので、**React / Next.js / Vue / Nuxt のどれでも同じものを使える**。

- 1 行目をヘッダ (日本語の項目名) として列定義と突き合わせる。列の並び順は自由
- 必須・文字数・形式 (メール・数値・全角カタカナ…) を検査し、エラーは行番号・項目名つきで最大 10 件まで返す
- ヘッダ・セルの前後の空白 (全角スペースも) は取り除く。区切り (カンマ / タブ) は自動で判定する
- エラーが 1 件でもあれば変換結果は返さない

挙動の細かい仕様は [SPEC.md](SPEC.md)、それを確かめるテストは `*.test.ts`。

## 導入

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

- TypeScript 5 / `strict` で書いてある。ブラウザでもサーバー (Node・SSR) でも動く
  (`copyOutput()` だけはブラウザのクリップボードを使う)。
- **Nuxt** では `utils/` の中身が自動 import の対象になる (`createCsvJson` などを import なしで書ける)。
  アプリの関数と名前がぶつかるときは import を明示する。

## 1. 列を定義する

`label` = 貼り付けるデータのヘッダ (項目名)、`key` = 変換後のキー、`usage` = 必須 / 省略可 / 不要。

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

よく使う検査 (`validators.ts`): `email()` `numeric()` `zenkaku()` `hankaku()` `zenkakuKatakana()` `hiragana()`
`pattern(正規表現, 文言)` `oneOf(候補)` `combine(検査…)`。どれも引数でエラーの文言を変えられる。
自前の検査は `(value: string) => string | null` (エラーなら理由、問題なければ null) を `validate` に渡す。

## 2. 変換だけする (関数 1 つ)

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

## 3. 入力画面を作る

`createCsvJson` が入力テキスト・出力形式・変換結果を持つ (`get()` / `subscribe()` で読む)。
画面はこの状態を描いて、`setText` / `setFormat` / `convert` を呼ぶだけ。

### React / Next.js

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

### Vue / Nuxt

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

## API

| 名前                                                     | 内容                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `convertDelimitedText(text, columns, format)`            | 検証して変換する。`{ ok: true, rows, output }` か `{ ok: false, errors }` を返す                              |
| `createCsvJson({ columns, text?, format?, onConvert? })` | 入力画面の状態を持つ。`get` / `subscribe` / `setText` / `setFormat` / `setColumns` / `convert` / `copyOutput` |
| `ColumnSpec`                                             | 列定義 (`label` / `key` / `usage` / `minLength` / `maxLength` / `validate`)                                   |
| `MAX_ERRORS`                                             | 返すエラーの上限 (10)                                                                                         |
| `OUTPUT_FORMATS`                                         | 出力形式の選択肢 (`json` / `csv` / `tsv` と表示名)                                                            |
| `createStore`                                            | `createCsvJson` が使っている小さなストア (`get` / `subscribe` / `set` / `patch`)                              |

## テスト

`*.test.ts` は [Vitest](https://vitest.dev/) で書いてある (`npm install -D vitest` → `npx vitest run src/utils`)。
Jest で流すなら、各ファイル先頭の `from "vitest"` を外し (Jest のグローバルの `describe` / `it` / `expect` を使う)、
`vi.fn()` を `jest.fn()` に置き換える。テストを使わないなら `*.test.ts` は消してよい。
