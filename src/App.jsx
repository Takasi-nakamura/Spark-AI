import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatView from './components/ChatView.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { fixedGreeting } from './lib/greetings.js'
import { callGemini, generateChatTitle } from './lib/gemini.js'
import { exportByFormat } from './lib/exportFile.js'
import { isFirebaseConfigured, watchAuthState, signIn, signUp, signOutUser, setFirebaseDisplayName } from './lib/firebase.js'
import { extractUrls, hasBrowseIntent } from './lib/urlBrowser.js'
import {
  loadJSON,
  saveJSON,
  storageKeys,
  DEFAULT_SETTINGS,
  getUsageState,
  incrementUsage,
} from './lib/storage.js'
import {
  appendTurn,
  editUserMessage,
  addAssistantVariant,
  switchUserVariant,
  switchAssistantVariant,
  findTurn,
  getActivePath,
  pathToApiMessages,
  getFirstUserContent,
} from './lib/conversationTree.js'

function newConversation() {
  return {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '新しいチャット',
    root: null,
    createdAt: Date.now(),
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const [conversations, setConversations] = useState(() => loadJSON(storageKeys.conversations, []))
  const [activeId, setActiveId] = useState(() => conversations[0]?.id || null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...loadJSON(storageKeys.settings, {}),
  }))
  const [apiKey, setApiKeyState] = useState(() => loadJSON(storageKeys.apiKey, ''))
  const [displayName, setDisplayNameState] = useState(() => loadJSON(storageKeys.displayName, ''))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('account')
  const [usage, setUsage] = useState(() => getUsageState())
  const [user, setUser] = useState(null)

  const [inputValue, setInputValue] = useState('')
  const [attachedFiles, setAttachedFiles] = useState([]) // { name, mimeType, data }
  const [activeTag, setActiveTag] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef(null)
  // 最新の conversations を副作用(API呼び出し)から安全に読むための ref。
  // setState の updater 内で副作用を呼ぶと React.StrictMode 下で二重実行されてしまうため、
  // 送信系の処理はすべてこの ref 経由で最新状態を読む方式に統一している。
  const conversationsRef = useRef(conversations)
  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])
  // handleSend/handleEditUserMessage/handleRegenerateの多重発火(連打・IME・二重イベント)を防ぐ同期ガード
  const sendingRef = useRef(false)
  const [sparkCodeSession, setSparkCodeSession] = useState(null)

  // ===== 永続化 =====
  useEffect(() => saveJSON(storageKeys.conversations, conversations), [conversations])
  useEffect(() => saveJSON(storageKeys.settings, settings), [settings])
  useEffect(() => saveJSON(storageKeys.apiKey, apiKey), [apiKey])
  useEffect(() => saveJSON(storageKeys.displayName, displayName), [displayName])

  // ===== テーマ適用 =====
  useEffect(() => {
    const apply = () => {
      let theme = settings.theme
      if (theme === 'system') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      document.documentElement.setAttribute('data-theme', theme)
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  // ===== フォント適用 =====
  useEffect(() => {
    document.documentElement.style.setProperty('--font-ui', settings.uiFont)
    document.documentElement.style.setProperty('--font-body', settings.responseFont)
  }, [settings.uiFont, settings.responseFont])

  // ===== 使用量の定期更新(表示用) =====
  useEffect(() => {
    const t = setInterval(() => setUsage(getUsageState()), 30000)
    return () => clearInterval(t)
  }, [])

  // ===== Firebase 認証(データ同期用。未設定ならゲストモードのまま動作) =====
  useEffect(() => {
    if (!isFirebaseConfigured) return
    const unsubscribe = watchAuthState((firebaseUser) => setUser(firebaseUser))
    return unsubscribe
  }, [])

  const auth = {
    user,
    displayName,
    setDisplayName: async (name) => {
      setDisplayNameState(name)
      if (isFirebaseConfigured && user) {
        try {
          await setFirebaseDisplayName(name)
        } catch {
          // 表示名の同期に失敗してもローカル状態は維持する
        }
      }
    },
    signIn,
    signUp,
    signOut: signOutUser,
  }

  const activeConversation = conversations.find((c) => c.id === activeId) || null

  const updateConversation = useCallback((id, updater) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const next = { ...c }
        updater(next)
        return next
      })
    )
  }, [])

  const handleNewChat = () => {
    const conv = newConversation()
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    setInputValue('')
    setAttachedFiles([])
    setActiveTag(null)
  }

  const handleSelectChat = (id) => {
    setActiveId(id)
    setInputValue('')
    setAttachedFiles([])
    setActiveTag(null)
  }

  const handleRenameChat = (id, title) => {
    updateConversation(id, (c) => {
      c.title = title
    })
  }

  const handleDeleteChat = (id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const handleAttachFiles = async (files) => {
    const converted = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        mimeType: f.type || 'application/octet-stream',
        data: await fileToBase64(f),
      }))
    )
    setAttachedFiles((prev) => [...prev, ...converted])
  }

  const handleRemoveFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const buildPromptWithTag = (text) => {
    if (!activeTag) return text
    if (activeTag.type === 'file-export') {
      return `${text}\n\n(この回答は最終的に ${activeTag.activeFormat} 形式として出力する想定です。それに適した内容・構成で書いてください)`
    }
    return `${text}\n\n(指示タグ「${activeTag.name}」: ${activeTag.description})`
  }

  const runGeneration = async (convId, turnId, apiMessages, lengthMode = 'normal') => {
    setIsStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      // 直近のユーザーメッセージに閲覧の意図付きでURLが含まれていれば、
      // Geminiの仮想ブラウザ(urlContext)機能を有効にする
      const lastUserMsg = [...apiMessages].reverse().find((m) => m.role === 'user')
      const browseUrls = lastUserMsg && hasBrowseIntent(lastUserMsg.content) ? extractUrls(lastUserMsg.content) : []

      const text = await callGemini({
        apiKey,
        modelId: settings.defaultModel,
        messages: apiMessages,
        personality: settings.personality,
        thinkingLevel: settings.defaultThinkingLevel,
        boostMode: settings.boostMode,
        lengthMode,
        browseUrls,
        signal: controller.signal,
      })
      updateConversation(convId, (c) => {
        const turn = findTurn(c.root, turnId)
        const uv = turn.userVariants[turn.activeUserIndex]
        const av = uv.assistantVariants[uv.activeAssistantIndex]
        av.content = text
        av.pending = false
      })
      setUsage(incrementUsage())
    } catch (err) {
      updateConversation(convId, (c) => {
        const turn = findTurn(c.root, turnId)
        const uv = turn.userVariants[turn.activeUserIndex]
        const av = uv.assistantVariants[uv.activeAssistantIndex]
        av.content = `⚠️ エラーが発生しました: ${err.message}`
        av.pending = false
      })
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  const handleSend = async () => {
    // 連打・IME確定時のEnter・二重イベント発火などによる二重送信を確実に防ぐガード。
    // isStreaming(state)はsetTimeout経由で1tick遅れて反映されるため、
    // ここでは即時反映されるrefを使う。
    if (sendingRef.current) return
    const text = inputValue.trim()
    if (!text && attachedFiles.length === 0) return
    if (!apiKey) {
      setSettingsTab('api')
      setSettingsOpen(true)
      return
    }
    sendingRef.current = true

    try {
      let conv = activeConversation
      if (!conv) {
        conv = newConversation()
        setConversations((prev) => [conv, ...prev])
        setActiveId(conv.id)
      }

      // Spark Codeタグが有効な場合は通常のチャット応答ではなく、
      // ファイル操作・コマンド実行ができるエージェントモードを直接起動する
      if (activeTag?.type === 'sparkcode') {
        setInputValue('')
        setAttachedFiles([])
        setActiveTag(null)
        setSparkCodeSession({ task: text || 'このプロジェクトを進めてください' })
        return
      }

      const promptText = buildPromptWithTag(text)
      const files = attachedFiles
      const tagForExport = activeTag?.type === 'file-export' ? activeTag.activeFormat : null
      const isFirstMessage = !conv.root

      setInputValue('')
      setAttachedFiles([])
      setActiveTag(null)

      let newTurnId = null
      updateConversation(conv.id, (c) => {
        c.root = appendTurn(c.root, promptText, files)
        const path = getActivePath(c.root)
        const lastTurn = path[path.length - 1].turn
        newTurnId = lastTurn.id
        if (tagForExport) lastTurn.exportFormat = tagForExport
        const av = addAssistantVariant(c.root, lastTurn.id, '', true)
        void av
      })

      // タイトル自動生成(初回メッセージのみ)
      if (isFirstMessage) {
        generateChatTitle({ apiKey, modelId: settings.defaultModel, firstMessage: text || 'ファイル添付' }).then(
          (title) => {
            updateConversation(conv.id, (c) => {
              c.title = title
            })
          }
        )
      }

      // API呼び出し用のメッセージ列を構築(state反映後に conversationsRef から最新値を読む)
      setTimeout(() => {
        const current = conversationsRef.current.find((c) => c.id === conv.id)
        if (current && newTurnId) {
          const path = getActivePath(current.root)
          const apiMessages = pathToApiMessages(path)
          runGeneration(conv.id, newTurnId, apiMessages, 'normal')
        }
      }, 0)
    } finally {
      // 実際の送信処理(state更新)は同期的に完了しているので、次のクリックは
      // すぐに新しいメッセージとして扱ってよい。ここでガードを解除する。
      sendingRef.current = false
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  const handleEditUserMessage = (turnId, newContent) => {
    if (!activeConversation) return
    if (sendingRef.current) return
    sendingRef.current = true
    updateConversation(activeConversation.id, (c) => {
      c.root = editUserMessage(c.root, turnId, newContent)
      addAssistantVariant(c.root, turnId, '', true)
    })
    setTimeout(() => {
      const current = conversationsRef.current.find((c) => c.id === activeConversation.id)
      if (current) {
        const path = getActivePath(current.root)
        const truncatedPath = []
        for (const item of path) {
          truncatedPath.push(item)
          if (item.turn.id === turnId) break
        }
        const apiMessages = pathToApiMessages(truncatedPath)
        runGeneration(activeConversation.id, turnId, apiMessages, 'normal')
      }
      sendingRef.current = false
    }, 0)
  }

  const handleRegenerate = (turnId, lengthMode = 'normal') => {
    if (!activeConversation) return
    if (sendingRef.current) return
    sendingRef.current = true
    updateConversation(activeConversation.id, (c) => {
      addAssistantVariant(c.root, turnId, '', true)
    })
    setTimeout(() => {
      const current = conversationsRef.current.find((c) => c.id === activeConversation.id)
      if (current) {
        const path = getActivePath(current.root)
        const truncatedPath = []
        for (const item of path) {
          truncatedPath.push(item)
          if (item.turn.id === turnId) break
        }
        const apiMessages = pathToApiMessages(truncatedPath)
        runGeneration(activeConversation.id, turnId, apiMessages, lengthMode)
      }
      sendingRef.current = false
    }, 0)
  }

  const handleSwitchUserVariant = (turnId, direction) => {
    updateConversation(activeConversation.id, (c) => {
      c.root = switchUserVariant(c.root, turnId, direction)
    })
  }

  const handleSwitchAssistantVariant = (turnId, direction) => {
    updateConversation(activeConversation.id, (c) => {
      c.root = switchAssistantVariant(c.root, turnId, direction)
    })
  }

  const handleExport = (format, content) => {
    exportByFormat(format, content)
  }

  // buttons ウィジェットの選択肢を押した時: その場でチャット欄にプロンプトを流し込む
  const handleQuickPrompt = (text) => {
    setInputValue(text)
  }

  const updateSettings = (patch) => setSettings((prev) => ({ ...prev, ...patch }))

  const openSettings = (tab = 'account') => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectChat}
        onNewChat={handleNewChat}
        onRename={handleRenameChat}
        onDelete={handleDeleteChat}
        onOpenSettings={() => openSettings('account')}
        displayName={displayName || user?.email?.split('@')[0]}
        isGuest={!user}
      />

      <ChatView
        conversation={activeConversation}
        greeting={fixedGreeting(displayName || user?.email?.split('@')[0])}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        tags={settings.tags}
        attachedFiles={attachedFiles}
        onAttachFiles={handleAttachFiles}
        onRemoveFile={handleRemoveFile}
        activeTag={activeTag}
        onSetActiveTag={setActiveTag}
        onClearTag={() => setActiveTag(null)}
        model={settings.defaultModel}
        setModel={(m) => updateSettings({ defaultModel: m })}
        thinkingLevel={settings.defaultThinkingLevel}
        setThinkingLevel={(l) => updateSettings({ defaultThinkingLevel: l })}
        boostMode={settings.boostMode}
        setBoostMode={(b) => updateSettings({ boostMode: b })}
        onEditUserMessage={handleEditUserMessage}
        onSwitchUserVariant={handleSwitchUserVariant}
        onRegenerate={handleRegenerate}
        onSwitchAssistantVariant={handleSwitchAssistantVariant}
        onExport={handleExport}
        onQuickPrompt={handleQuickPrompt}
        sidebarCollapsed={sidebarCollapsed}
        onOpenSidebar={() => setSidebarCollapsed(false)}
        apiKey={apiKey}
        modelId={settings.defaultModel}
        sparkCodeAutonomous={!!settings.sparkCodeAutonomous}
        onOpenSparkCode={(task) => setSparkCodeSession({ task })}
        sparkCodeSession={sparkCodeSession}
        onCloseSparkCode={() => setSparkCodeSession(null)}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsTab}
        settings={settings}
        updateSettings={updateSettings}
        apiKey={apiKey}
        setApiKey={setApiKeyState}
        usage={usage}
        auth={auth}
      />
    </div>
  )
}
