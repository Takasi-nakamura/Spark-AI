// 表示名を使った固定の挨拶文言を返す(以前はランダム変化する挨拶だったが固定表示に変更)
export function fixedGreeting(displayName) {
  const name = (displayName || '').trim()
  return name ? `${name}さん、今日は何をしましょうか?` : '今日は何をしましょうか?'
}
