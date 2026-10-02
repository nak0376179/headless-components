// よく使うバリデータのビルダー集。ColumnSpec.validate にそのまま渡せる。
//   例: { label: "部署", key: "dept", usage: "optional", maxLength: 10, validate: zenkaku() }
// いずれも「空でない値」に対してのみ呼ばれる（空値の必須チェックは usage が担う）。
// 「全角N文字」のような長さの制約は minLength / maxLength と組み合わせて表現する。
import type { ColumnValidator } from "./convert"

/** 任意の正規表現でチェックする汎用ビルダー。マッチしなければ message を返す。 */
export const pattern =
  (re: RegExp, message: string): ColumnValidator =>
  (value) =>
    re.test(value) ? null : message

// 半角以外（＝全角とみなす）文字が 1 つでもあるか判定する。
const HAS_FULL_WIDTH = /[^\x20-\x7E｡-ﾟ]/
// 全体が半角文字（印字可能な ASCII と半角カナ）だけかを判定する。
const HALF_WIDTH_ONLY = /^[\x20-\x7E｡-ﾟ]+$/

/**
 * 全角を含む（半角の混在は許可）。例「第1開発部」は通り、半角だけの「Dev」は弾く。
 * 「全角を含む N 文字以内」は maxLength / minLength と併用する。
 */
export const zenkaku =
  (message = "全角を含めて入力してください"): ColumnValidator =>
  (value) =>
    HAS_FULL_WIDTH.test(value) ? null : message

/** 半角のみ（印字可能な ASCII・半角カナ）。 */
export const hankaku =
  (message = "半角で入力してください"): ColumnValidator =>
  (value) =>
    HALF_WIDTH_ONLY.test(value) ? null : message

/** 全角カタカナ（＋長音符）。フリガナなどに。 */
export const zenkakuKatakana = (message = "全角カタカナで入力してください"): ColumnValidator =>
  pattern(/^[ァ-ヶー]+$/, message)

/** ひらがな（＋長音符）。 */
export const hiragana = (message = "ひらがなで入力してください"): ColumnValidator =>
  pattern(/^[ぁ-んー]+$/, message)

/** 半角数字のみ。 */
export const numeric = (message = "数値で入力してください"): ColumnValidator =>
  pattern(/^\d+$/, message)

/** メールアドレス形式。 */
export const email = (message = "メールアドレスの形式ではありません"): ColumnValidator =>
  pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message)

/** 決められた候補のいずれか。 */
export const oneOf =
  (allowed: string[], message?: string): ColumnValidator =>
  (value) =>
    allowed.includes(value)
      ? null
      : (message ?? `${allowed.join(" / ")} のいずれかで入力してください`)

/** 複数のバリデータを順に適用し、最初のエラーを返す（すべて通れば null）。 */
export const combine =
  (...validators: ColumnValidator[]): ColumnValidator =>
  (value) => {
    for (const fn of validators) {
      const reason = fn(value)
      if (reason !== null) return reason
    }
    return null
  }
