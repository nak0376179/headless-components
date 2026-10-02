import { describe, expect, it } from "vitest"
import { convertDelimitedText, MAX_ERRORS, type ColumnSpec } from "./convert"

/** テスト用の列定義。氏名・メールは必須、年齢は省略可、メモは不要。 */
const columns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required" },
  {
    label: "メールアドレス",
    key: "email",
    usage: "required",
    validate: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "メールアドレスの形式ではありません",
  },
  {
    label: "年齢",
    key: "age",
    usage: "optional",
    validate: (v) => (/^\d+$/.test(v) ? null : "数値で入力してください"),
  },
  { label: "メモ", key: "memo", usage: "unused" },
]

describe("変換の基本挙動", () => {
  it("CSV を JSON に変換できる（不要な列は削られる）", () => {
    const input = ["氏名,メールアドレス,年齢,メモ", "山田太郎,taro@example.com,30,備考A"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "30" }])
    expect(JSON.parse(result.output)).toEqual(result.rows)
  })

  it("TSV も自動判別して変換できる", () => {
    const input = ["氏名\tメールアドレス\t年齢", "山田太郎\ttaro@example.com\t30"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "30" }])
  })

  it("入力の列順が違っても、キーは列定義の順に組みなおされる", () => {
    const input = ["年齢,氏名,メールアドレス", "30,山田太郎,taro@example.com"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.rows[0])).toEqual(["name", "email", "age"])
  })

  it("ヘッダとセルの前後の空白は取り除かれる", () => {
    const input = [" 氏名 , メールアドレス , 年齢 ", " 山田太郎 , taro@example.com , 30 "].join(
      "\n",
    )
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "30" }])
  })

  it("省略可の列が入力にない場合は空文字で埋める", () => {
    const input = ["氏名,メールアドレス", "山田太郎,taro@example.com"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "" }])
  })

  it("必須項目が空の行はエラーになる", () => {
    const input = ["氏名,メールアドレス,年齢", ",taro@example.com,30"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([{ row: 2, label: "氏名", message: "2行目: 「氏名」は必須です" }])
  })

  it("バリデーションエラーは行番号と項目名つきで返る", () => {
    const input = [
      "氏名,メールアドレス,年齢",
      "山田太郎,これはメールではない,30",
      "佐藤花子,hanako@example.com,abc",
    ].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      {
        row: 2,
        label: "メールアドレス",
        message: "2行目: 「メールアドレス」が不正です（メールアドレスの形式ではありません）",
      },
      { row: 3, label: "年齢", message: "3行目: 「年齢」が不正です（数値で入力してください）" },
    ])
  })

  it("項目数が足りない行はエラーになる", () => {
    const input = ["氏名,メールアドレス,年齢", "山田太郎,taro@example.com"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      { row: 2, label: null, message: "2行目: 項目が不足しています（3列必要ですが2列です）" },
    ])
  })

  it("定義されていない項目名がヘッダにあるとエラーになる", () => {
    const input = ["氏名,メールアドレス,住所", "山田太郎,taro@example.com,東京"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      { row: null, label: "住所", message: "ヘッダ: 「住所」は定義されていない項目です" },
    ])
  })

  it("必須項目がヘッダにないとエラーになる", () => {
    const input = ["氏名,年齢", "山田太郎,30"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      {
        row: null,
        label: "メールアドレス",
        message: "ヘッダ: 必須項目「メールアドレス」がありません",
      },
    ])
  })

  it("エラーは最大10件で打ち切られる（11件目以降は出ない）", () => {
    expect(MAX_ERRORS).toBe(10)
    // 12 行すべて必須もれ → エラーは 12 件になりうるが、上限の 10 件で打ち切られる。
    const body = Array.from({ length: 12 }, () => ",taro@example.com,30")
    const input = ["氏名,メールアドレス,年齢", ...body].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveLength(MAX_ERRORS)
    // 打ち切られているので、最後（11 行目＝12件目）のエラーは含まれない。
    expect(result.errors.some((e) => e.row === 13)).toBe(false)
  })

  it("空行は読み飛ばし、行番号は貼り付けテキストの行のまま数える", () => {
    const input = ["氏名,メールアドレス,年齢", "", "山田太郎,,30"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      { row: 3, label: "メールアドレス", message: "3行目: 「メールアドレス」は必須です" },
    ])
  })

  it("空入力・データ行なしはエラーになる", () => {
    const empty = convertDelimitedText("   ", columns)
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.errors[0].message).toBe("データがありません")

    const headerOnly = convertDelimitedText("氏名,メールアドレス,年齢", columns)
    expect(headerOnly.ok).toBe(false)
    if (!headerOnly.ok) expect(headerOnly.errors[0].message).toBe("データ行がありません")
  })

  it("CSV 形式でも出力できる（キーは列定義の順）", () => {
    const input = [
      "年齢,氏名,メールアドレス",
      "30,山田太郎,taro@example.com",
      "25,佐藤花子,hanako@example.com",
    ].join("\n")
    const result = convertDelimitedText(input, columns, "csv")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(
      ["name,email,age", "山田太郎,taro@example.com,30", "佐藤花子,hanako@example.com,25"].join(
        "\r\n",
      ),
    )
  })

  it("TSV 形式でも出力できる（タブ区切り・キーは列定義の順）", () => {
    const input = ["年齢,氏名,メールアドレス", "30,山田太郎,taro@example.com"].join("\n")
    const result = convertDelimitedText(input, columns, "tsv")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(["name\temail\tage", "山田太郎\ttaro@example.com\t30"].join("\r\n"))
  })
})

describe("文字数バリデーション", () => {
  /** 氏名は 2〜5 文字、ニックネームは 8 文字以内・省略可。 */
  const columns: ColumnSpec[] = [
    { label: "氏名", key: "name", usage: "required", minLength: 2, maxLength: 5 },
    { label: "ニックネーム", key: "nick", usage: "optional", maxLength: 8 },
  ]

  it("最大文字数を超えるとエラーになる（現在の文字数つき）", () => {
    const result = convertDelimitedText(["氏名", "山田太郎次郎左衛門"].join("\n"), columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      {
        row: 2,
        label: "氏名",
        message: "2行目: 「氏名」は5文字以内で入力してください（現在9文字）",
      },
    ])
  })

  it("最小文字数を下回るとエラーになる", () => {
    const result = convertDelimitedText(["氏名", "李"].join("\n"), columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      {
        row: 2,
        label: "氏名",
        message: "2行目: 「氏名」は2文字以上で入力してください（現在1文字）",
      },
    ])
  })

  it("文字数の範囲内なら変換できる", () => {
    const result = convertDelimitedText(
      ["氏名,ニックネーム", "山田,やまちゃん"].join("\n"),
      columns,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田", nick: "やまちゃん" }])
  })

  it("省略可の列が空なら文字数チェックはされない", () => {
    const result = convertDelimitedText(["氏名,ニックネーム", "山田,"].join("\n"), columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田", nick: "" }])
  })

  it("絵文字（サロゲートペア）も1文字として数える", () => {
    const emoji: ColumnSpec[] = [{ label: "記号", key: "sym", usage: "required", maxLength: 2 }]
    const ok = convertDelimitedText(["記号", "😀😀"].join("\n"), emoji)
    expect(ok.ok).toBe(true)
    const ng = convertDelimitedText(["記号", "😀😀😀"].join("\n"), emoji)
    expect(ng.ok).toBe(false)
    if (ng.ok) return
    expect(ng.errors[0].message).toBe("2行目: 「記号」は2文字以内で入力してください（現在3文字）")
  })

  it("文字数チェックは validate より先に走る", () => {
    const spec: ColumnSpec[] = [
      {
        label: "コード",
        key: "code",
        usage: "required",
        maxLength: 3,
        validate: () => "常に不正",
      },
    ]
    const result = convertDelimitedText(["コード", "ABCD"].join("\n"), spec)
    expect(result.ok).toBe(false)
    if (result.ok) return
    // 文字数エラーが優先され、validate（常に不正）のメッセージは出ない。
    expect(result.errors).toEqual([
      {
        row: 2,
        label: "コード",
        message: "2行目: 「コード」は3文字以内で入力してください（現在4文字）",
      },
    ])
  })
})

describe("入力パースとトリム", () => {
  const columns: ColumnSpec[] = [
    { label: "氏名", key: "name", usage: "required" },
    {
      label: "メールアドレス",
      key: "email",
      usage: "required",
      validate: (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "メールアドレスの形式ではありません",
    },
    { label: "年齢", key: "age", usage: "optional" },
    { label: "メモ", key: "memo", usage: "unused" },
  ]

  it("全角スペースも前後トリムされる", () => {
    const input = ["氏名,メールアドレス", "　山田太郎　,　taro@example.com　"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "" }])
  })

  it("値の途中の空白は保持される", () => {
    const input = ["氏名,メールアドレス", " 山 田 ,taro@example.com"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0].name).toBe("山 田")
  })

  it("空白だけの必須セルは空値扱いでエラーになる（半角・全角とも）", () => {
    const half = convertDelimitedText(
      ["氏名,メールアドレス", "   ,taro@example.com"].join("\n"),
      columns,
    )
    expect(half.ok).toBe(false)
    if (!half.ok) expect(half.errors[0].message).toBe("2行目: 「氏名」は必須です")

    const full = convertDelimitedText(
      ["氏名,メールアドレス", "　　,taro@example.com"].join("\n"),
      columns,
    )
    expect(full.ok).toBe(false)
    if (!full.ok) expect(full.errors[0].message).toBe("2行目: 「氏名」は必須です")
  })

  it("空白だけの省略可セルは空値として通る", () => {
    const input = ["氏名,メールアドレス,年齢", "山田太郎,taro@example.com,   "].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0].age).toBe("")
  })

  it("項目が多すぎる行はエラーになる", () => {
    const input = ["氏名,メールアドレス", "山田太郎,taro@example.com,余分"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      { row: 2, label: null, message: "2行目: 項目が多すぎます（2列必要ですが3列です）" },
    ])
  })

  it("ヘッダの項目名が重複するとエラーになる", () => {
    const input = ["氏名,氏名,メールアドレス", "山田太郎,タロウ,taro@example.com"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toContainEqual({
      row: null,
      label: "氏名",
      message: "ヘッダ: 「氏名」が重複しています",
    })
  })

  it("ヘッダに空の項目名があるとエラーになる", () => {
    const input = ["氏名,,メールアドレス", "山田太郎,x,taro@example.com"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toContainEqual({
      row: null,
      label: null,
      message: "ヘッダ: 2列目の項目名が空です",
    })
  })

  it("引用符で囲んでも、値にカンマがあればエラーになる (列はずれない)", () => {
    const input = ["氏名,メールアドレス", '"山田, 太郎",taro@example.com'].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      { row: 2, label: "氏名", message: "2行目: 「氏名」にカンマ（,）は使えません" },
    ])
  })

  it("カンマのエラーは文字数・validate より先に判定する (1 セル 1 件)", () => {
    const spec: ColumnSpec = {
      label: "項目",
      key: "v",
      usage: "required",
      maxLength: 2,
      validate: () => "だめ",
    }
    const result = convertDelimitedText("項目\t備考\nあ,いうえお\tx", [
      spec,
      { label: "備考", key: "n", usage: "unused" },
    ])
    expect(result.ok ? [] : result.errors.map((e) => e.message)).toEqual([
      "2行目: 「項目」にカンマ（,）は使えません",
    ])
  })

  it("不要 (unused) の列はカンマがあっても検査しない", () => {
    const result = convertDelimitedText(
      ["氏名\tメールアドレス\tメモ", "山田\ta@example.com\tA,B"].join("\n"),
      columns,
    )
    expect(result.ok).toBe(true)
  })

  it("CRLF 改行でも変換できる", () => {
    const input = ["氏名,メールアドレス", "山田太郎,taro@example.com"].join("\r\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "" }])
  })

  it("CSV 出力では改行・引用符を含む値が引用される", () => {
    const input = ["氏名\tメールアドレス", '"山田\n太郎"\ttaro@example.com'].join("\n")
    const result = convertDelimitedText(input, columns, "csv")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(["name,email,age", '"山田\n太郎",taro@example.com,'].join("\r\n"))
  })

  it("TSV で末尾セルが空でも列数がずれない（末尾のタブを削らない）", () => {
    // 末尾セル（年齢）が空 → 行は "…\t" で終わる。input.trim() で末尾タブを削ると
    // 列数が足りずエラーになっていた（回帰テスト）。
    const input = ["氏名\tメールアドレス\t年齢", "山田太郎\ttaro@example.com\t"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "" }])
  })

  it("前後に空行があっても、ヘッダと行番号は先頭の非空行から数える", () => {
    const input = ["", "  ", "氏名,メールアドレス", ",taro@example.com", ""].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    // 先頭の空行 2 行を除いた上で、ヘッダ=1行目・データ=2行目として数える。
    expect(result.errors).toEqual([{ row: 2, label: "氏名", message: "2行目: 「氏名」は必須です" }])
  })
})

describe("エラーの上限での打ち切り", () => {
  // どの種類のエラーで 10 件目に達しても、そこで検査をやめる
  const limited = (spec: ColumnSpec, value: string) => {
    const input = ["項目", ...Array.from({ length: 12 }, () => value)].join("\n")
    const result = convertDelimitedText(input, [spec])
    return result.ok ? 0 : result.errors.length
  }

  it("文字数の上限を超えるエラーが続いても 10 件で止まる", () => {
    expect(limited({ label: "項目", key: "v", usage: "required", maxLength: 2 }, "あいう")).toBe(
      MAX_ERRORS,
    )
  })

  it("文字数の下限を下回るエラーが続いても 10 件で止まる", () => {
    expect(limited({ label: "項目", key: "v", usage: "required", minLength: 3 }, "あ")).toBe(
      MAX_ERRORS,
    )
  })

  it("validate のエラーが続いても 10 件で止まる", () => {
    const spec: ColumnSpec = { label: "項目", key: "v", usage: "required", validate: () => "だめ" }
    expect(limited(spec, "あ")).toBe(MAX_ERRORS)
  })

  it("列数の誤りが続いても 10 件で止まる", () => {
    expect(limited({ label: "項目", key: "v", usage: "required" }, "あ,い")).toBe(MAX_ERRORS)
  })
})

describe("ヘッダのエラーの上限", () => {
  it("定義に無い項目名が 11 個以上あっても、エラーは 10 件まで", () => {
    const header = Array.from({ length: 12 }, (_, i) => `余計な項目${i + 1}`).join(",")
    const result = convertDelimitedText(
      `氏名,メールアドレス,${header}\n山田,a@example.com`,
      columns,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveLength(MAX_ERRORS)
    expect(result.errors.at(-1)?.message).toBe("ヘッダ: 「余計な項目10」は定義されていない項目です")
  })
})

describe("カンマのエラーの上限", () => {
  it("値のカンマのエラーが続いても 10 件で止まる", () => {
    const input = ["項目\t備考", ...Array.from({ length: 12 }, () => "あ,い\tx")].join("\n")
    const result = convertDelimitedText(input, [
      { label: "項目", key: "v", usage: "required" },
      { label: "備考", key: "n", usage: "optional" },
    ])
    expect(result.ok ? 0 : result.errors.length).toBe(MAX_ERRORS)
  })
})
