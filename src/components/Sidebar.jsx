import { useMemo, useState } from 'react'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SquarePen,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
} from 'lucide-react'

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onOpenSettings,
  displayName,
  isGuest,
}) {
  const [query, setQuery] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations
    return conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
  }, [conversations, query])

  return (
    <aside
      className="sb-root"
      style={{
        width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
      }}
    >
      <div className="sb-top">
        <button
          className="sb-icon-btn"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
          title={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {!collapsed ? (
        <div className="sb-search">
          <Search size={16} className="sb-search-icon" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="チャットを検索"
            aria-label="チャットを検索"
          />
        </div>
      ) : (
        <button className="sb-icon-btn" title="チャットを検索" aria-label="チャットを検索">
          <Search size={20} />
        </button>
      )}

      <button className={`sb-newchat ${collapsed ? 'collapsed' : ''}`} onClick={onNewChat}>
        <SquarePen size={18} />
        {!collapsed && <span>新しいチャット</span>}
      </button>

      <div className="sb-list scroll-y hide-scrollbar">
        {!collapsed &&
          filtered.map((c) => (
            <div
              key={c.id}
              className={`sb-item ${c.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(c.id)}
            >
              <MessageSquare size={16} className="sb-item-icon" />
              {renamingId === c.id ? (
                <input
                  className="sb-rename-input"
                  autoFocus
                  value={renameValue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => {
                    onRename(c.id, renameValue.trim() || c.title)
                    setRenamingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur()
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                />
              ) : (
                <span className="sb-item-title">{c.title}</span>
              )}
              <div className="sb-item-menu-wrap">
                <button
                  className="sb-item-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpenId(menuOpenId === c.id ? null : c.id)
                  }}
                  aria-label="チャットのメニュー"
                >
                  <MoreHorizontal size={16} />
                </button>
                {menuOpenId === c.id && (
                  <div className="sb-item-menu" onMouseLeave={() => setMenuOpenId(null)}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setRenamingId(c.id)
                        setRenameValue(c.title)
                        setMenuOpenId(null)
                      }}
                    >
                      <Pencil size={14} /> 名前を変更
                    </button>
                    <button
                      className="danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`「${c.title}」を削除しますか？この操作は取り消せません。`)) {
                          onDelete(c.id)
                        }
                        setMenuOpenId(null)
                      }}
                    >
                      <Trash2 size={14} /> 削除
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      <button className={`sb-account ${collapsed ? 'collapsed' : ''}`} onClick={onOpenSettings}>
        <span className="sb-avatar">
          <User size={16} />
        </span>
        {!collapsed && (
          <span className="sb-account-text">
            <span className="sb-account-name">{displayName || 'ゲスト'}</span>
            <span className="sb-account-sub">{isGuest ? 'ゲスト利用中' : '設定を開く'}</span>
          </span>
        )}
      </button>
    </aside>
  )
}
