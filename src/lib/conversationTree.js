// 会話を「ターンの連鎖」として表現するツリー構造。
// 1ターン = ユーザー発言(複数バージョン=編集履歴を保持) + そのバージョンごとのAI応答(複数バージョン=再生成履歴を保持)
// 編集や再生成をしても、以前のバージョンは消さずに前後移動(2/2のような表示)できるようにする。
//
// Turn            = { id, userVariants: UserVariant[], activeUserIndex }
// UserVariant     = { id, content, files, assistantVariants: AssistantVariant[], activeAssistantIndex }
// AssistantVariant= { id, content, pending, next: Turn | null }

let idCounter = 0
export function genId() {
  idCounter += 1
  return `${Date.now().toString(36)}-${idCounter}`
}

export function createUserVariant(content, files = []) {
  return {
    id: genId(),
    content,
    files,
    assistantVariants: [],
    activeAssistantIndex: 0,
  }
}

export function createAssistantVariant(content = '', pending = false) {
  return { id: genId(), content, pending, next: null }
}

export function createTurn(content, files = []) {
  return {
    id: genId(),
    userVariants: [createUserVariant(content, files)],
    activeUserIndex: 0,
  }
}

// アクティブな経路(現在表示すべきターンの連なり)を先頭から辿って配列で返す
export function getActivePath(root) {
  const path = []
  let turn = root
  while (turn) {
    const uv = turn.userVariants[turn.activeUserIndex]
    const av = uv?.assistantVariants?.[uv.activeAssistantIndex] || null
    path.push({ turn, userVariant: uv, assistantVariant: av })
    turn = av?.next || null
  }
  return path
}

// Gemini APIへ渡すための { role, content, files } 配列に変換
export function pathToApiMessages(path) {
  const messages = []
  for (const { userVariant, assistantVariant } of path) {
    if (!userVariant) continue
    messages.push({ role: 'user', content: userVariant.content, files: userVariant.files })
    if (assistantVariant && !assistantVariant.pending && assistantVariant.content) {
      messages.push({ role: 'assistant', content: assistantVariant.content })
    }
  }
  return messages
}

// 末尾に新しいターン(ユーザー発言)を追加。戻り値は新しいroot。
export function appendTurn(root, content, files) {
  const newTurn = createTurn(content, files)
  if (!root) return newTurn

  const path = getActivePath(root)
  const last = path[path.length - 1]
  if (last.assistantVariant) {
    last.assistantVariant.next = newTurn
  }
  return root
}

// 指定ターンのユーザー発言を編集 → 新バージョンを追加してアクティブにする(以降の会話はこのバージョン配下で新規に構築される)
export function editUserMessage(root, turnId, newContent) {
  const turn = findTurn(root, turnId)
  if (!turn) return root
  const newVariant = createUserVariant(newContent, turn.userVariants[turn.activeUserIndex]?.files || [])
  turn.userVariants.push(newVariant)
  turn.activeUserIndex = turn.userVariants.length - 1
  return root
}

// 指定ターンのAI応答を再生成 → 新バージョンを追加してアクティブにする
export function addAssistantVariant(root, turnId, content = '', pending = true) {
  const turn = findTurn(root, turnId)
  if (!turn) return null
  const uv = turn.userVariants[turn.activeUserIndex]
  const newVariant = createAssistantVariant(content, pending)
  uv.assistantVariants.push(newVariant)
  uv.activeAssistantIndex = uv.assistantVariants.length - 1
  return newVariant
}

export function findTurn(root, turnId) {
  let turn = root
  while (turn) {
    if (turn.id === turnId) return turn
    const uv = turn.userVariants[turn.activeUserIndex]
    turn = uv?.assistantVariants?.[uv.activeAssistantIndex]?.next || null
    // 念のため全バージョンも探索(通常はアクティブ経路上にあるはず)
  }
  // アクティブ経路上に見つからない場合は全体を深さ優先探索
  return deepFind(root, turnId)
}

function deepFind(turn, turnId) {
  if (!turn) return null
  if (turn.id === turnId) return turn
  for (const uv of turn.userVariants) {
    for (const av of uv.assistantVariants) {
      const found = deepFind(av.next, turnId)
      if (found) return found
    }
  }
  return null
}

export function switchUserVariant(root, turnId, direction) {
  const turn = findTurn(root, turnId)
  if (!turn) return root
  const next = turn.activeUserIndex + direction
  if (next < 0 || next >= turn.userVariants.length) return root
  turn.activeUserIndex = next
  return root
}

export function switchAssistantVariant(root, turnId, direction) {
  const turn = findTurn(root, turnId)
  if (!turn) return root
  const uv = turn.userVariants[turn.activeUserIndex]
  const next = uv.activeAssistantIndex + direction
  if (next < 0 || next >= uv.assistantVariants.length) return root
  uv.activeAssistantIndex = next
  return root
}

export function getFirstUserContent(root) {
  return root?.userVariants?.[root.activeUserIndex]?.content || ''
}
