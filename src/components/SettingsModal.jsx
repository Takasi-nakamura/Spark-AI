import { useState } from 'react'
import {
  X,
  UserCircle,
  KeyRound,
  Sparkles,
  Palette,
  Gauge,
  Tags as TagsIcon,
  Plus,
  Trash2,
  LogOut,
  ExternalLink,
} from 'lucide-react'
import UsageBar from './UsageBar.jsx'
import { USAGE_WINDOW_MS } from '../lib/storage.js'
import { isFirebaseConfigured } from '../lib/firebase.js'

const TABS = [
  { id: 'account', label: 'アカウント設定', icon: UserCircle },
  { id: 'api', label: 'API設定', icon: KeyRound },
  { id: 'personality', label: 'パーソナリティー設定', icon: Sparkles },
  { id: 'design', label: 'デザイン設定', icon: Palette },
  { id: 'usage', label: '使用量上限', icon: Gauge },
  { id: 'tags', label: 'タグ', icon: TagsIcon },
]

const FONT_CHOICES = [
  'M PLUS Rounded 1c',
  'Noto Sans JP',
  '"Hiragino Sans", sans-serif',
  '"Yu Gothic", sans-serif',
]

export default function SettingsModal({
  open,
  onClose,
  initialTab = 'account',
  settings,
  updateSettings,
  apiKey,
  setApiKey,
  usage,
  auth,
}) {
  const [tab, setTab] = useState(initialTab)
  const [apiKeyDraft, setApiKeyDraft] = useState(apiKey || '')
  const [newTagName, setNewTagName] = useState('')
  const [newTagDesc, setNewTagDesc] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')

  if (!open) return null

  const handleAddTag = () => {
    if (!newTagName.trim()) return
    updateSettings({
      tags: [
        ...settings.tags,
        {
          id: `tag-${Date.now()}`,
          name: newTagName.trim(),
          description: newTagDesc.trim(),
          type: 'custom',
        },
      ],
    })
    setNewTagName('')
    setNewTagDesc('')
  }

  const handleRemoveTag = (id) => {
    updateSettings({ tags: settings.tags.filter((t) => t.id !== id) })
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    try {
      if (authMode === 'login') {
        await auth.signIn(email, password)
      } else {
        await auth.signUp(email, password)
      }
    } catch (err) {
      setAuthError(err.message || 'エラーが発生しました')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sidebar">
          <div className="modal-title">設定</div>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`modal-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-content scroll-y">
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>

          {tab === 'account' && (
            <section>
              <h2>アカウント設定</h2>
              {!isFirebaseConfigured && (
                <p className="modal-note">
                  Firebaseが未設定のため、現在はゲストモードのみ利用できます。README.mdの手順に沿って
                  .env に Firebase の設定値を入力すると、アカウント作成・ログイン・データ同期機能が有効になります。
                </p>
              )}
              {auth.user ? (
                <div className="account-panel">
                  <div className="account-row">
                    <span className="account-label">表示名</span>
                    <input
                      value={auth.displayName}
                      onChange={(e) => auth.setDisplayName(e.target.value)}
                      placeholder="表示名を入力"
                    />
                  </div>
                  <div className="account-row">
                    <span className="account-label">メールアドレス</span>
                    <span>{auth.user.email}</span>
                  </div>
                  <button className="danger-btn" onClick={auth.signOut}>
                    <LogOut size={15} /> ログアウト
                  </button>
                </div>
              ) : (
                <div className="account-panel">
                  <div className="account-row">
                    <span className="account-label">表示名(ゲスト)</span>
                    <input
                      value={auth.displayName}
                      onChange={(e) => auth.setDisplayName(e.target.value)}
                      placeholder="ゲストの表示名"
                    />
                  </div>
                  {isFirebaseConfigured && (
                    <form className="auth-form" onSubmit={handleAuth}>
                      <div className="auth-mode-switch">
                        <button
                          type="button"
                          className={authMode === 'login' ? 'active' : ''}
                          onClick={() => setAuthMode('login')}
                        >
                          ログイン
                        </button>
                        <button
                          type="button"
                          className={authMode === 'signup' ? 'active' : ''}
                          onClick={() => setAuthMode('signup')}
                        >
                          新規登録
                        </button>
                      </div>
                      <input
                        type="email"
                        placeholder="メールアドレス"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <input
                        type="password"
                        placeholder="パスワード(6文字以上)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                      {authError && <div className="auth-error">{authError}</div>}
                      <button type="submit" className="primary-btn">
                        {authMode === 'login' ? 'ログイン' : 'アカウントを作成'}
                      </button>
                    </form>
                  )}
                  <p className="modal-note">ログインしなくてもゲストとしてすべての機能を利用できます。</p>
                </div>
              )}
            </section>
          )}

          {tab === 'api' && (
            <section>
              <h2>API設定</h2>
              <p className="modal-note">
                Gemini の APIキーはこの端末のブラウザ内にのみ保存され、外部サーバーには送信されません。
              </p>
              <div className="account-row column">
                <span className="account-label">Gemini APIキー</span>
                <input
                  type="password"
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  placeholder="AIzaSy から始まるキーを貼り付け"
                />
              </div>
              <button className="primary-btn" onClick={() => setApiKey(apiKeyDraft.trim())}>
                保存する
              </button>
              <a
                className="modal-link"
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
              >
                Google AI Studio でAPIキーを取得 <ExternalLink size={13} />
              </a>
            </section>
          )}

          {tab === 'personality' && (
            <section>
              <h2>パーソナリティー設定</h2>
              <div className="account-row column">
                <span className="account-label">なんて呼びますか</span>
                <input
                  value={settings.personality.nickname}
                  onChange={(e) =>
                    updateSettings({ personality: { ...settings.personality, nickname: e.target.value } })
                  }
                  placeholder="例: たろう"
                />
              </div>
              <div className="account-row column">
                <span className="account-label">カスタム指示</span>
                <textarea
                  rows={4}
                  value={settings.personality.customInstructions}
                  onChange={(e) =>
                    updateSettings({
                      personality: { ...settings.personality, customInstructions: e.target.value },
                    })
                  }
                  placeholder="回答のトーンや注意してほしいことなど"
                />
              </div>
              <div className="account-row column">
                <span className="account-label">メモリのインポート</span>
                <textarea
                  rows={4}
                  value={settings.personality.memory}
                  onChange={(e) =>
                    updateSettings({ personality: { ...settings.personality, memory: e.target.value } })
                  }
                  placeholder="他のAIサービス等からエクスポートした記憶メモを貼り付け"
                />
              </div>
            </section>
          )}

          {tab === 'design' && (
            <section>
              <h2>デザイン設定</h2>
              <div className="account-row column">
                <span className="account-label">テーマ</span>
                <div className="segmented">
                  {['light', 'dark', 'system'].map((v) => (
                    <button
                      key={v}
                      className={settings.theme === v ? 'active' : ''}
                      onClick={() => updateSettings({ theme: v })}
                    >
                      {v === 'light' ? 'ライト' : v === 'dark' ? 'ダーク' : 'システム'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="account-row column">
                <span className="account-label">UIフォント</span>
                <select value={settings.uiFont} onChange={(e) => updateSettings({ uiFont: e.target.value })}>
                  {FONT_CHOICES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className="account-row column">
                <span className="account-label">回答フォント</span>
                <select
                  value={settings.responseFont}
                  onChange={(e) => updateSettings({ responseFont: e.target.value })}
                >
                  {FONT_CHOICES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          {tab === 'usage' && (
            <section>
              <h2>使用量上限</h2>
              <UsageBar usage={usage} windowMs={USAGE_WINDOW_MS} />
              <p className="modal-note">
                5時間ごとに自動的にリセットされます。実際の利用可否はGoogleのGemini APIの無料枠に依存します。
              </p>
            </section>
          )}

          {tab === 'tags' && (
            <section>
              <h2>タグ</h2>
              <p className="modal-note">
                入力欄の「+」から呼び出せるタグを作成できます。タグ名と内容(何をするか)を指定すると、送信時にその内容が指示として付加されます。
              </p>
              <div className="tag-list">
                {settings.tags.map((t) => (
                  <div key={t.id} className="tag-list-item">
                    <div>
                      <div className="tag-list-name">{t.name}</div>
                      <div className="tag-list-desc">
                        {t.type === 'file-export' ? '回答をファイル形式で出力' : t.type === 'sparkcode' ? 'Spark Code(公式タグ)を起動する' : t.description}
                      </div>
                    </div>
                    {t.type !== 'file-export' && t.type !== 'sparkcode' && (
                      <button onClick={() => handleRemoveTag(t.id)} aria-label="タグを削除">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="tag-new">
                <input placeholder="タグ名" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
                <input
                  placeholder="内容(何をするか)"
                  value={newTagDesc}
                  onChange={(e) => setNewTagDesc(e.target.value)}
                />
                <button className="primary-btn" onClick={handleAddTag}>
                  <Plus size={15} /> 追加
                </button>
              </div>

              <div className="sparkcode-autonomy">
                <div>
                  <div className="tag-list-name">Spark Codeの自律実行</div>
                  <div className="tag-list-desc">
                    ONにすると、AIがファイル作成やコマンド実行を確認なしに連続して行います。OFFの場合は1操作ごとに承認が必要です。
                  </div>
                </div>
                <button
                  className={`sparkcode-switch ${settings.sparkCodeAutonomous ? 'on' : ''}`}
                  onClick={() => updateSettings({ sparkCodeAutonomous: !settings.sparkCodeAutonomous })}
                  aria-pressed={!!settings.sparkCodeAutonomous}
                  aria-label="Spark Codeの自律実行を切り替え"
                >
                  <span className={`switch ${settings.sparkCodeAutonomous ? 'on' : ''}`}>
                    <span className="switch-knob" />
                  </span>
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
