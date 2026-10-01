/** 送信を少し待たせる (送信中の表示を見せるため)。 */
export const fakeSave = () => new Promise((r) => setTimeout(r, 600))
