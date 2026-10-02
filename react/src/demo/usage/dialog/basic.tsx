import type { ReactNode } from "react"
import { Button } from "@mui/material"
import { createDialogs } from "@/utils/draft"
import { DialogHost } from "@/components/draft/DialogHost"

// 1. アプリで 1 つ作る (どこからでも import して使う)
export const dialogs = createDialogs()

// 2. アプリの一番外側に 1 か所だけ置く
export function AppRoot({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DialogHost dialogs={dialogs} />
    </>
  )
}

// 3. 使う所では await するだけ (開く・閉じる・送信中の状態を自分で持たなくてよい)
export function DeleteButton({ name, onDelete }: { name: string; onDelete: () => Promise<void> }) {
  const click = async () => {
    const ok = await dialogs.confirm({
      title: `「${name}」を削除しますか？`,
      message: "この操作は元に戻せません。",
      danger: true, // 赤いボタン・既定の文言は「削除」
      // 押したら削除が終わるまで送信中のまま。失敗したら閉じずにエラーと「もう一度」を出す
      onConfirm: onDelete,
    })
    if (ok) {
      await dialogs.alert({ title: "削除しました" })
    }
  }
  return (
    <Button color="error" onClick={() => void click()}>
      削除
    </Button>
  )
}

// 入力してもらう: キャンセルなら null。validate が通るまで OK を押せない
export async function rename(current: string): Promise<string | null> {
  return dialogs.prompt({
    title: "名前を変える",
    label: "新しい名前",
    defaultValue: current,
    validate: (v) => (v.trim() ? null : "入力してください"),
  })
}
