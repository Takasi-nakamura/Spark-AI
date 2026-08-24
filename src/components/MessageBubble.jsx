import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  User,
  Sparkles,
  Paperclip,
  Copy,
  Check,
  Pencil,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  FileDown,
  Maximize2,
  Minimize2,
  FileText,
  Globe,
  TerminalSquare,
} from 'lucide-react'
import CodeBlock from './CodeBlock.jsx'
import { ChartWidget, AlertWidget, StepsWidget, QuizWidget, CardWidget, ButtonWidget } from './Widgets.jsx'
import { extractUrls, hasBrowseIntent } from '../lib/urlBrowser.js'

function CodeRenderer({ className, children, onQuickPrompt, onOpenSparkCode, ...props }) {
  const match = /language-(\S+)/.exec(className || '')
  const lang = match?.[1]
  const codeStr = String(children).replace(/\n$/, '')

  if (lang === 'chart') return <ChartWidget spec={codeStr} />
  if (lang === 'alert') return <AlertWidget spec={codeStr} />
  if (lang === 'steps') return <StepsWidget spec={codeStr} />
  if (lang === 'quiz') return <QuizWidget spec={codeStr} />
  if (lang === 'card') return <CardWidget spec={codeStr} />
  if (lang === 'buttons') return <ButtonWidget spec={codeStr} onChoose={onQuickPrompt} />

  if (lang === 'spark-code-suggest') {
    let task = codeStr
    try {
      const parsed = JSON.parse(codeStr)
      task = parsed.task || parsed.summary || codeStr
    } catch {
      // JSONでなければそのままタスク文言として使う
    }
    return (
      <button className="sparkcode-suggest-chip" onClick={() => onOpenSparkCode?.(task)}>
        <TerminalSquare size={14} /> Spark Codeで実行する: {task}
      </button>
    )
  }

  if (!lang && !codeStr.includes('\n')) {
    return (
      <code className="inline-code" {...props}>
        {children}
      </code>
    )
  }
  return <CodeBlock language={lang} code={codeStr} />
}

function Markdown({ content, onQuickPrompt, onOpenSparkCode }) {
  return (
    <div className="msg-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ code: (p) => <CodeRenderer {...p} onQuickPrompt={onQuickPrompt} onOpenSparkCode={onOpenSparkCode} /> }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function useCopy(text) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // noop
    }
  }
  return [copied, copy]
}

function VariantNav({ index, total, onPrev, onNext }) {
  if (total <= 1) return null
  return (
    <span className="variant-nav">
      <button onClick={onPrev} disabled={index === 0} aria-label="前のバージョン">
        <ChevronLeft size={13} />
      </button>
      <span className="variant-nav-count">
        {index + 1}/{total}
      </span>
      <button onClick={onNext} disabled={index === total - 1} aria-label="次のバージョン">
        <ChevronRight size={13} />
      </button>
    </span>
  )
}

function VirtualBrowserModal({ url, onClose }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="vbrowser-modal-backdrop" onClick={onClose}>
      <div className="vbrowser-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vbrowser-header">
          <Globe size={14} />
          <span className="vbrowser-url">{url}</span>
          <button className="file-preview-close" onClick={onClose} aria-label="閉じる">
            <X size={16} />
          </button>
        </div>
        {!failed ? (
          <iframe
            className="vbrowser-frame"
            src={url}
            title="仮想ブラウザ"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="file-preview-info">
            <Globe size={28} />
            <span>このサイトはアプリ内表示に対応していません</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function UserMessage({ turn, userVariant, userIndex, userTotal, onEdit, onSwitchVariant }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(userVariant.content)
  const [copied, copy] = useCopy(userVariant.content)
  const [preview, setPreview] = useState(null)
  const [browserUrl, setBrowserUrl] = useState(null)
  const browseUrls = hasBrowseIntent(userVariant.content) ? extractUrls(userVariant.content) : []

  const startEdit = () => {
    setDraft(userVariant.content)
    setEditing(true)
  }

  const submitEdit = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      // 空文字での送信はバグの元になるため、編集前の内容に戻してキャンセル扱いにする
      setEditing(false)
      return
    }
    if (trimmed !== userVariant.content) {
      onEdit(turn.id, trimmed)
    }
    setEditing(false)
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditing(false)
    }
  }

  return (
    <div className="msg-row msg-user">
      <div className="msg-avatar" aria-hidden="true">
        <User size={16} />
      </div>
      <div className="msg-body">
        {userVariant.files?.length > 0 && (
          <div className="msg-files">
            {userVariant.files.map((f, i) => (
              <button
                key={i}
                className="msg-file-chip"
                onClick={() => {
                  // dataから画像またはPDFをプレビュー
                  if (f.mimeType?.startsWith('image/')) {
                    setPreview({ type: 'image', src: `data:${f.mimeType};base64,${f.data}`, name: f.name })
                  } else if (f.mimeType === 'application/pdf') {
                    const bytes = atob(f.data)
                    const arr = new Uint8Array(bytes.length)
                    for (let j = 0; j < bytes.length; j++) arr[j] = bytes.charCodeAt(j)
                    const blob = new Blob([arr], { type: 'application/pdf' })
                    setPreview({ type: 'pdf', src: URL.createObjectURL(blob), name: f.name })
                  } else {
                    setPreview({ type: 'file', name: f.name, size: f.data.length })
                  }
                }}
              >
                <Paperclip size={12} /> {f.name}
              </button>
            ))}
          </div>
        )}

        {browseUrls.length > 0 && (
          <div className="msg-files">
            {browseUrls.map((u, i) => (
              <button key={i} className="msg-file-chip vbrowser-chip" onClick={() => setBrowserUrl(u)}>
                <Globe size={12} /> 仮想ブラウザで開く: {u.length > 40 ? u.slice(0, 40) + '…' : u}
              </button>
            ))}
          </div>
        )}

        {editing ? (
          <div className="edit-popup">
            <textarea
              className="edit-popup-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleEditKeyDown}
              autoFocus
              rows={Math.min(8, Math.max(2, draft.split('\n').length))}
            />
            <div className="edit-popup-actions">
              <span className="edit-popup-hint">Enterで送信 / Shift+Enterで改行 / Escでキャンセル</span>
              <button className="edit-popup-cancel" onClick={() => setEditing(false)}>
                <X size={14} /> キャンセル
              </button>
              <button className="edit-popup-submit" onClick={submitEdit} disabled={!draft.trim()}>
                <Send size={14} /> この内容で送り直す
              </button>
            </div>
          </div>
        ) : (
          <div className="msg-user-bubble">{userVariant.content}</div>
        )}

        {!editing && (
          <div className="msg-toolbar">
            <button className="msg-toolbar-btn" onClick={copy} title="コピー">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <button className="msg-toolbar-btn" onClick={startEdit} title="編集">
              <Pencil size={13} />
            </button>
            <VariantNav
              index={userIndex}
              total={userTotal}
              onPrev={() => onSwitchVariant(turn.id, -1)}
              onNext={() => onSwitchVariant(turn.id, 1)}
            />
          </div>
        )}
      </div>

      {preview && (
        <div className="file-preview-modal-backdrop" onClick={() => setPreview(null)}>
          <div className="file-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="file-preview-header">
              <h3>{preview.name}</h3>
              <button className="file-preview-close" onClick={() => setPreview(null)} aria-label="閉じる">
                <X size={18} />
              </button>
            </div>
            <div className="file-preview-body">
              {preview.type === 'image' && <img src={preview.src} alt="preview" />}
              {preview.type === 'pdf' && <iframe src={preview.src} title="PDF" style={{ width: '100%', height: '100%', border: 'none' }} />}
              {preview.type === 'file' && <div className="file-preview-info">ファイル: {(preview.size / 1024).toFixed(1)} KB</div>}
            </div>
          </div>
        </div>
      )}
      {browserUrl && <VirtualBrowserModal url={browserUrl} onClose={() => setBrowserUrl(null)} />}
    </div>
  )
}

function RegenerateMenu({ onRegenerate, onExport }) {
  const [open, setOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [customExt, setCustomExt] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const close = () => {
    setOpen(false)
    setExportOpen(false)
  }

  return (
    <div className="regen-menu-wrap" ref={wrapRef}>
      <button
        className="msg-toolbar-btn"
        onClick={() => setOpen((v) => !v)}
        title="再生成"
        aria-expanded={open}
      >
        <RefreshCw size={13} />
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="regen-menu">
          <button className="regen-menu-item" onClick={() => { onRegenerate('normal'); close() }}>
            <RefreshCw size={14} />
            <span>普通に再生成</span>
          </button>
          <button className="regen-menu-item" onClick={() => { onRegenerate('longer'); close() }}>
            <Maximize2 size={14} />
            <span>長く</span>
          </button>
          <button className="regen-menu-item" onClick={() => { onRegenerate('shorter'); close() }}>
            <Minimize2 size={14} />
            <span>短く</span>
          </button>
          <div className="regen-menu-divider" />
          <button
            className="regen-menu-item"
            onClick={(e) => { e.stopPropagation(); setExportOpen((v) => !v) }}
          >
            <FileDown size={14} />
            <span>ファイル出力</span>
            <ChevronRight size={13} className="regen-menu-arrow" />
          </button>
          {exportOpen && (
            <div className="regen-submenu">
              <button className="regen-menu-item" onClick={() => { onExport('pdf'); close() }}>
                <FileText size={14} /> <span>PDF</span>
              </button>
              <button className="regen-menu-item" onClick={() => { onExport('html'); close() }}>
                <FileText size={14} /> <span>HTML</span>
              </button>
              <button className="regen-menu-item" onClick={() => { onExport('css'); close() }}>
                <FileText size={14} /> <span>CSS</span>
              </button>
              <div className="regen-submenu-custom">
                <input
                  className="regen-submenu-input"
                  placeholder="拡張子(例: md)"
                  value={customExt}
                  onChange={(e) => setCustomExt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customExt.trim()) {
                      onExport(customExt.trim())
                      close()
                    }
                  }}
                />
                <button
                  className="regen-submenu-go"
                  disabled={!customExt.trim()}
                  onClick={() => { onExport(customExt.trim()); close() }}
                >
                  出力
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AssistantMessage({
  turn,
  assistantVariant,
  assistantIndex,
  assistantTotal,
  onRegenerate,
  onSwitchVariant,
  onExport,
  onQuickPrompt,
  onOpenSparkCode,
  exportFormat,
}) {
  const content = assistantVariant?.content || ''
  const [copied, copy] = useCopy(content)
  const pending = assistantVariant?.pending

  return (
    <div className="msg-row msg-assistant">
      <div className="msg-avatar" aria-hidden="true">
        <Sparkles size={16} />
      </div>
      <div className="msg-body">
        {pending ? (
          <div className="msg-typing">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <Markdown content={content} onQuickPrompt={onQuickPrompt} onOpenSparkCode={onOpenSparkCode} />
        )}

        {!pending && content && (
          <div className="msg-toolbar">
            <button className="msg-toolbar-btn" onClick={copy} title="コピー">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <RegenerateMenu
              onRegenerate={(mode) => onRegenerate(turn.id, mode)}
              onExport={(format) => onExport(format, content)}
            />
            {exportFormat && (
              <button
                className="msg-toolbar-btn"
                onClick={() => onExport(exportFormat, content)}
                title={`タグ指定の形式(${exportFormat})で出力`}
              >
                <FileDown size={13} />
              </button>
            )}
            <VariantNav
              index={assistantIndex}
              total={assistantTotal}
              onPrev={() => onSwitchVariant(turn.id, -1)}
              onNext={() => onSwitchVariant(turn.id, 1)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
