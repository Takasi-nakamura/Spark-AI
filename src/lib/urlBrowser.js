// ユーザーのプロンプトに含まれるURLを検出し、「仮想ブラウザ」でそのページを見に行くべきかどうかを判定する。
// (実際のページ取得はGemini APIのURLコンテキスト機能に任せ、こちらはUI表示とAPIへのヒント付与を担当する)

const URL_RE = /https?:\/\/[^\s<>"'()]+/g

// URLの近くに「見て」「調べて」「要約して」等の閲覧を促す言葉があるかどうかで、
// 単にURLを貼っただけなのか、明確に見に行ってほしい指示なのかを簡易的に判定する。
const BROWSE_INTENT_WORDS = [
  '見て', '見に行って', '確認して', '調べて', '読んで', '要約', 'まとめて', '開いて',
  'アクセス', 'チェック', '見てきて', '見てほしい', '内容を', '中身を', 'サイト',
]

export function extractUrls(text) {
  if (!text) return []
  const matches = text.match(URL_RE) || []
  // 重複除去
  return [...new Set(matches)]
}

export function hasBrowseIntent(text) {
  if (!text) return false
  const urls = extractUrls(text)
  if (urls.length === 0) return false
  return BROWSE_INTENT_WORDS.some((w) => text.includes(w))
}
