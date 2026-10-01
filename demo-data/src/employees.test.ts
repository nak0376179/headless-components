import { describe, expect, it } from "vitest"
import { createEmployeeDirectory, createEmployeeSource, SEED_EMPLOYEES } from "./employees"

const settle = async (dir: ReturnType<typeof createEmployeeDirectory>) => {
  for (let i = 0; i < 50 && dir.get().loading; i++) await new Promise((r) => setTimeout(r, 0))
}

describe("createEmployeeDirectory", () => {
  it("全件を読み込み、追加・編集・削除のあと取り直す", async () => {
    const dir = createEmployeeDirectory(createEmployeeSource(0))
    await settle(dir)
    expect(dir.get().items).toHaveLength(SEED_EMPLOYEES.length)

    dir.openCreate()
    dir.updateForm({ email: "bad" })
    await dir.submitForm()
    expect(dir.get().form?.error).toContain("メールアドレス")

    dir.updateForm({ email: "new@example.com", name: "新人" })
    await dir.submitForm()
    expect(dir.get().form).toBeNull()
    expect(dir.get().items).toHaveLength(SEED_EMPLOYEES.length + 1)

    const target = dir.get().items.find((e) => e.email === "new@example.com")!
    dir.openEdit(target)
    dir.updateForm({ role: "リーダー" })
    await dir.submitForm()
    expect(dir.get().items.find((e) => e.email === "new@example.com")?.role).toBe("リーダー")

    dir.askDelete(target)
    await dir.confirmDelete()
    expect(dir.get().deleting).toBeNull()
    expect(dir.get().items).toHaveLength(SEED_EMPLOYEES.length)
  })

  it("重複したメールアドレスの追加はフォームのエラーになる", async () => {
    const dir = createEmployeeDirectory(createEmployeeSource(0))
    await settle(dir)
    dir.openCreate()
    dir.updateForm({ email: SEED_EMPLOYEES[0].email, name: "重複" })
    await dir.submitForm()
    expect(dir.get().form?.error).toContain("既に存在")
  })
})
