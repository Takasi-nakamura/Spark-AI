// Gemini API との通信をまとめたモジュール。
// APIキーはユーザーのブラウザ内(localStorage)にのみ保存し、
// Google の generativelanguage.googleapis.com へ直接リクエストします。

export const MODELS = [
  { id: 'gemini-1.5-flash-8b', label: '3.5 Flash-Lite', hint: '一番速い・軽量タスク向け' },
  { id: 'gemini-2.0-flash', label: '3.6 Flash', hint: 'バランス型・標準モデル' },
]

export const THINKING_LEVELS = [
  { id: 1, label: 'Ⅰ', hint: '素早く回答' },
  { id: 2, label: 'Ⅱ', hint: '標準的に考える' },
  { id: 3, label: 'Ⅲ', hint: 'じっくり深く考える' },
]

const FORMAT_GUIDE = `あなたはSpark AIです。回答は基本的に読みやすい日本語のテキストで行い、必要な場合のみ以下の専用フォーマットを組み合わせて使用できます。
- 表: 標準的なMarkdownテーブル構文を使う
- コード: 通常の \`\`\`言語名 コードブロックを使う
- グラフ: \`\`\`chart というコードブロックの中に {"type":"bar|bar-horizontal|line|pie","title":"タイトル","labels":["A","B"],"datasets":[{"label":"系列名","data":[1,2]}]} 形式のJSONを書く(barは縦棒、bar-horizontalは横棒、lineは折れ線、pieは円グラフ。pieの場合はdatasetsの1つ目のdataのみ使う)
- 注意事項を目立たせたい時: \`\`\`alert というコードブロックの中に {"level":"info|warning|danger|success","title":"見出し","text":"本文"} 形式のJSONを書く(successは完了・成功を表す)
- 手順を示したい時: \`\`\`steps というコードブロックの中に [{"title":"手順名","description":"説明"}, ...] 形式のJSON配列を書く
- 理解度テスト/クイズを出す時: \`\`\`quiz というコードブロックの中に {"title":"タイトル","questions":[{"question":"問題文","options":["選択肢1","選択肢2","選択肢3"],"correctIndex":0,"explanation":"解説(任意)"}]} 形式のJSONを書く。ユーザーが自分のタイミングで開いて回答し、採点される
- 情報をカードで整理したい時: \`\`\`card というコードブロックの中に {"cards":[{"title":"見出し","description":"本文","tag":"任意のラベル"}]} 形式のJSONを書く
- 次にユーザーが選びそうな選択肢を提示したい時: \`\`\`buttons というコードブロックの中に {"options":[{"label":"ボタンに表示する文字","prompt":"押した時に入力欄へ入る文章"}]} 形式のJSONを書く
- ユーザーの依頼が実際にファイルを作成したりコマンドを実行するような開発作業(アプリ制作、スクリプト実行、環境構築など)だと判断した場合、通常のテキストで軽く答えたうえで、\`\`\`spark-code-suggest というコードブロックの中に {"task":"Spark Codeで行う作業の要約"} 形式のJSONを書いて、Spark Code機能(実際にファイル操作・コマンド実行ができるモード)の利用を提案できます
これらは必要な時だけ使い、乱用しないでください。`

function buildSystemInstruction({ personality, thinkingLevel, boostMode, lengthMode, hasBrowseUrls }) {
  const parts = [FORMAT_GUIDE]
  if (personality?.nickname) {
    parts.push(`ユーザーのことは「${personality.nickname}」と呼んでください。`)
  }
  if (personality?.customInstructions) {
    parts.push(personality.customInstructions)
  }
  if (personality?.memory) {
    parts.push(`ユーザーに関する記憶メモ:\n${personality.memory}`)
  }
  const thinkingHint = THINKING_LEVELS.find((t) => t.id === thinkingLevel)
  if (thinkingHint) {
    parts.push(`思考の深さレベルは${thinkingHint.label}(${thinkingHint.hint})を意識してください。`)
  }
  if (boostMode) {
    parts.push('強化解決思考モードが有効です。回答前に問題を分解し、複数の視点から検証してから、根拠を示しつつ結論を述べてください。')
  }
  if (hasBrowseUrls) {
    parts.push(
      '仮想ブラウザ機能が有効です。ユーザーのメッセージに含まれるURL先のページに実際にアクセスし、その内容を踏まえて回答してください。'
    )
  }
  if (lengthMode === 'longer') {
    parts.push('今回はこの直前の回答をもとに、普段よりも長く・詳しく・具体例を交えて書き直してください。')
  } else if (lengthMode === 'shorter') {
    parts.push('今回はこの直前の回答をもとに、普段よりも短く・簡潔に要点だけまとめ直してください。')
  }
  return parts.filter(Boolean).join('\n')
}

// messages: [{ role: 'user' | 'assistant', content: string, files?: [{mimeType, data(base64)}] }]
export async function callGemini({ apiKey, modelId, messages, personality, thinkingLevel, boostMode, lengthMode, browseUrls, signal }) {
  if (!apiKey) {
    throw new Error('APIキーが設定されていません。設定 → API設定 から Gemini の APIキーを保存してください。')
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [
      ...(m.content ? [{ text: m.content }] : []),
      ...(m.files || []).map((f) => ({
        inlineData: { mimeType: f.mimeType, data: f.data },
      })),
    ],
  }))

  const systemInstructionText = buildSystemInstruction({
    personality,
    thinkingLevel,
    boostMode,
    lengthMode,
    hasBrowseUrls: browseUrls && browseUrls.length > 0,
  })

  const body = {
    contents,
    ...(systemInstructionText
      ? { systemInstruction: { parts: [{ text: systemInstructionText }] } }
      : {}),
    generationConfig: {
      temperature: boostMode ? 0.4 : 0.8,
    },
    // ユーザーの指示に明確なURL閲覧の意図がある場合、Gemini自身にそのページの中身を
    // 取得させる「仮想ブラウザ」機能として urlContext ツールを有効にする。
    ...(browseUrls && browseUrls.length > 0 ? { tools: [{ urlContext: {} }] } : {}),
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  // urlContext がこのモデル/APIバージョンで使えない場合は、ツール無しで一度だけ再試行する
  if (!res.ok && body.tools) {
    const retryBody = { ...body }
    delete retryBody.tools
    const retryRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(retryBody),
      signal,
    })
    if (retryRes.ok) res = retryRes
  }

  if (!res.ok) {
    const errText = await res.text()
    let message = errText
    try {
      const parsed = JSON.parse(errText)
      message = parsed?.error?.message || errText
    } catch {
      // noop
    }
    throw new Error(`Gemini APIエラー (${res.status}): ${message}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
  return text
}

// ===== Spark Code(エージェント型のツール呼び出し)用 =====
// Gemini の Function Calling を使い、1ステップぶんだけ問い合わせる。
// 呼び出し側(SparkCode.jsx)が contents 配列全体の履歴管理とループ制御を担う。
export async function callGeminiStep({ apiKey, modelId, contents, systemInstructionText, tools, signal }) {
  if (!apiKey) {
    throw new Error('APIキーが設定されていません。設定 → API設定 から Gemini の APIキーを保存してください。')
  }
  const body = {
    contents,
    ...(systemInstructionText ? { systemInstruction: { parts: [{ text: systemInstructionText }] } } : {}),
    ...(tools && tools.length > 0 ? { tools: [{ functionDeclarations: tools }] } : {}),
    generationConfig: { temperature: 0.3 },
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const errText = await res.text()
    let message = errText
    try {
      message = JSON.parse(errText)?.error?.message || errText
    } catch {
      // noop
    }
    throw new Error(`Gemini APIエラー (${res.status}): ${message}`)
  }

  const data = await res.json()
  const candidate = data?.candidates?.[0]
  const parts = candidate?.content?.parts || []
  const functionCalls = parts.filter((p) => p.functionCall).map((p) => p.functionCall)
  const text = parts
    .filter((p) => p.text)
    .map((p) => p.text)
    .join('')
  return { text, functionCalls, parts, finishReason: candidate?.finishReason }
}

export async function generateChatTitle({ apiKey, modelId, firstMessage }) {
  try {
    const text = await callGemini({
      apiKey,
      modelId,
      messages: [
        {
          role: 'user',
          content: `次の発言に10文字以内の短い日本語タイトルを1つだけ、記号や引用符なしで付けてください:\n「${firstMessage}」`,
        },
      ],
      personality: {},
      thinkingLevel: 1,
      boostMode: false,
    })
    return text.trim().replace(/^["「『]|["」』]$/g, '').slice(0, 20) || firstMessage.slice(0, 20)
  } catch {
    return firstMessage.slice(0, 20)
  }
}
