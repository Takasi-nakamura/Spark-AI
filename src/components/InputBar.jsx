import { useRef, useState } from 'react'
import { ArrowUp, X, FileText, File, Tag as TagIcon, Square, Paperclip } from 'lucide-react'
import TagFileMenu from './TagFileMenu.jsx'
import ModelSelector from './ModelSelector.jsx'

function FilePreviewModal({ file, onClose }) {
  if (!file) return null
  const isImage = file.mimeType?.startsWith('image/')
  const isPdf = file.mimeType === 'application/pdf'
  const dataUrl = `data:${file.mimeType};base64,${file.data}`
  return (
    <div className="file-preview-modal-backdrop" onClick={onClose}>
      <div className="file-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="file-preview-header">
          <h3>{file.name}</h3>
          <button className="file-preview-close" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>
        <div className="file-preview-body">
          {isImage && <img src={dataUrl} alt={file.name} />}
          {isPdf && <iframe src={dataUrl} title={file.name} style={{ width: '100%', height: '100%', border: 'none' }} />}
          {!isImage && !isPdf && (
            <div className="file-preview-info">
              <File size={28} />
              <span>このファイル形式はプレビューに対応していません</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InputBar({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  tags,
  attachedFiles,
  onAttachFiles,
  onRemoveFile,
  activeTag,
  onSetActiveTag,
  onClearTag,
  model,
  setModel,
  thinkingLevel,
  setThinkingLevel,
  boostMode,
  setBoostMode,
}) {
  const textareaRef = useRef(null)
  const [previewIndex, setPreviewIndex] = useState(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const autoResize = (e) => {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 220) + 'px'
  }

  return (
    <div className="input-bar">
      {(attachedFiles.length > 0 || activeTag) && (
        <div className="input-chips">
          {activeTag && (
            <span className="input-chip tag-chip">
              {activeTag.type === 'file-export' ? <FileText size={12} /> : <TagIcon size={12} />}
              {activeTag.name}
              {activeTag.activeFormat ? `: ${activeTag.activeFormat}` : ''}
              <button onClick={onClearTag} aria-label="タグを外す">
                <X size={12} />
              </button>
            </span>
          )}
          {attachedFiles.map((f, i) => {
            const isImage = f.mimeType?.startsWith('image/')
            return (
              <button key={i} className="input-chip file-chip" onClick={() => setPreviewIndex(i)} title="クリックしてプレビュー">
                {isImage ? (
                  <img className="file-chip-thumb" src={`data:${f.mimeType};base64,${f.data}`} alt={f.name} />
                ) : (
                  <Paperclip size={12} />
                )}
                <span className="file-chip-name">{f.name}</span>
                <span
                  className="file-chip-remove"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveFile(i)
                  }}
                  aria-label="ファイルを外す"
                >
                  <X size={12} />
                </span>
              </button>
            )
          })}
        </div>
      )}

      <textarea
        ref={textareaRef}
        className="input-textarea"
        placeholder="Spark AI にメッセージを送る"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          autoResize(e)
        }}
        onKeyDown={handleKeyDown}
        rows={1}
      />

      <div className="input-toolbar">
        <div className="input-toolbar-left">
          <TagFileMenu tags={tags} onPickFile={onAttachFiles} onPickTag={onSetActiveTag} />
          <ModelSelector
            model={model}
            setModel={setModel}
            thinkingLevel={thinkingLevel}
            setThinkingLevel={setThinkingLevel}
            boostMode={boostMode}
            setBoostMode={setBoostMode}
          />
        </div>
        <div className="input-toolbar-right">
          {isStreaming ? (
            <button className="send-btn stop" onClick={onStop} aria-label="停止">
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              className="send-btn"
              onClick={onSend}
              disabled={!value.trim() && attachedFiles.length === 0}
              aria-label="送信"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
      </div>

      {previewIndex !== null && (
        <FilePreviewModal file={attachedFiles[previewIndex]} onClose={() => setPreviewIndex(null)} />
      )}
    </div>
  )
}
