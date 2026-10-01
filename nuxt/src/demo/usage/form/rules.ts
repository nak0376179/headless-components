import { countBetween, createForm, required, toggleInList, type FieldRule } from "@core"

type Values = { plan: string; seats: string; hobbies: string[]; agree: boolean }

// 他の項目を見る検査は 2 つ目の引数 (いまの値すべて) を使う
const seatsForPlan: FieldRule<string, Values> = (seats, v) =>
  v.plan === "free" && Number(seats) > 3 ? "フリーは 3 席まで" : null

// UI なしでも使える (テストやサーバーとの共有など)
const form = createForm<Values>({
  initial: { plan: "free", seats: "1", hobbies: [], agree: false },
  rules: {
    plan: required(),
    seats: seatsForPlan,
    hobbies: countBetween(1, 3), // 配列の個数 (チェックボックス・複数選択)
    agree: (v) => (v ? null : "同意が必要です"), // 検査は「理由か null を返す関数」なら何でもよい
  },
})

// チェックボックスの一覧は toggleInList で出し入れする (選択肢の順に揃える)
const ORDER = ["reading", "music", "travel"]
form.setValue("hobbies", toggleInList(form.get().values.hobbies, "travel", ORDER))
console.log(form.get().errors) // { seats?: …, hobbies?: …, agree: "同意が必要です" }
