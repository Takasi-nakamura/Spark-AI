// すべてのローカル保存(APIキー・設定・会話履歴・使用量)をまとめるモジュール。
// Firebaseログイン時はここに加えてクラウド同期も行う(App.jsx側で制御)。

const KEYS = {
  apiKey: 'spark-ai:gemini-api-key',
  settings: 'spark-ai:settings',
  conversations: 'spark-ai:conversations',
  usage: 'spark-ai:usage',
  displayName: 'spark-ai:display-name',
}

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 保存容量オーバー等は無視(致命的ではないため)
  }
}

export const storageKeys = KEYS

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'light' | 'dark' | 'system'
  uiFont: 'M PLUS Rounded 1c',
  responseFont: 'Noto Sans JP',
  personality: {
    nickname: '',
    customInstructions: '',
    memory: '',
  },
  tags: [
    {
      id: 'default-file-export',
      name: 'ファイル出力',
      description: '回答をPDF / HTML / CSS などの形式で出力する',
      type: 'file-export',
      formats: ['PDF', 'HTML', 'CSS'],
    },
    {
      id: 'default-sparkcode',
      name: 'Spark Code',
      description:
        'Claude Codeのようなエージェントモードを起動し、AIが実際にファイル作成・コマンド実行を行いながらタスクを進める(公式タグ)',
      type: 'sparkcode',
    },
  ],
  defaultModel: 'gemini-2.0-flash',
  defaultThinkingLevel: 1,
  boostMode: false,
  // Spark Codeの自律実行モード。trueならAIが確認なしにファイル操作・コマンド実行を連続で行う。
  // falseなら1操作ごとにユーザーの承認を待つ。
  sparkCodeAutonomous: false,
}

export const USAGE_LIMIT = 60 // 5時間ごとにリセットされるメッセージ数の目安上限
export const USAGE_WINDOW_MS = 5 * 60 * 60 * 1000 // 5時間

export function getUsageState() {
  const usage = loadJSON(KEYS.usage, { count: 0, windowStart: Date.now() })
  if (Date.now() - usage.windowStart > USAGE_WINDOW_MS) {
    const reset = { count: 0, windowStart: Date.now() }
    saveJSON(KEYS.usage, reset)
    return reset
  }
  return usage
}

export function incrementUsage() {
  const usage = getUsageState()
  const updated = { ...usage, count: usage.count + 1 }
  saveJSON(KEYS.usage, updated)
  return updated
}
