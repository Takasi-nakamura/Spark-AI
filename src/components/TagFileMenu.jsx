import { useEffect, useRef, useState } from 'react'
import { Plus, Paperclip, Tag, FileText, ChevronRight, TerminalSquare } from 'lucide-react'

export default function TagFileMenu({ tags, onPickFile, onPickTag }) {
  const [open, setOpen] = useState(false)
  const [exportSubmenu, setExportSubmenu] = useState(false)
  const ref = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setExportSubmenu(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const exportTag = tags.find((t) => t.type === 'file-export')
  const sparkCodeTag = tags.find((t) => t.type === 'sparkcode')
  const otherTags = tags.filter((t) => t.type !== 'file-export' && t.type !== 'sparkcode')

  return (
    <div className="tag-menu-wrap" ref={ref}>
      <button className="input-icon-btn" onClick={() => setOpen((o) => !o)} title="タグ・ファイル添付" aria-label="タグ・ファイル添付">
        <Plus size={18} />
      </button>

      {/*
        重要: この <input type="file"> はメニューの開閉状態に関わらず常にマウントしておく。
        以前は {open && (...)} の中に置いていたため、ネイティブのファイル選択ダイアログが
        閉じるより先に setOpen(false) で input 自体がアンマウントされ、
        onChange (change イベント) が発火せず「ファイルをアップロードできない」不具合の原因になっていた。
      */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) {
            onPickFile(Array.from(e.target.files))
          }
          e.target.value = ''
        }}
      />

      {open && (
        <div className="tag-menu">
          <button
            className="tag-menu-item"
            onClick={() => {
              fileInputRef.current?.click()
              setOpen(false)
            }}
          >
            <Paperclip size={15} /> ファイルをアップロード
          </button>

          {sparkCodeTag && (
            <button
              className="tag-menu-item"
              onClick={() => {
                onPickTag(sparkCodeTag)
                setOpen(false)
              }}
            >
              <TerminalSquare size={15} /> {sparkCodeTag.name}
            </button>
          )}

          {exportTag && (
            <div className="tag-menu-item-wrap">
              <button className="tag-menu-item" onClick={() => setExportSubmenu((v) => !v)}>
                <FileText size={15} /> {exportTag.name}
                <ChevronRight size={14} className="tag-menu-chevron" />
              </button>
              {exportSubmenu && (
                <div className="tag-submenu">
                  {(exportTag.formats || ['PDF', 'HTML', 'CSS']).map((f) => (
                    <button
                      key={f}
                      className="tag-submenu-item"
                      onClick={() => {
                        onPickTag({ ...exportTag, activeFormat: f })
                        setOpen(false)
                        setExportSubmenu(false)
                      }}
                    >
                      {f}
                    </button>
                  ))}
                  <div className="tag-submenu-custom">
                    <input
                      placeholder="自由入力(例: md)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          onPickTag({ ...exportTag, activeFormat: e.target.value.trim() })
                          setOpen(false)
                          setExportSubmenu(false)
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {otherTags.map((tag) => (
            <button
              key={tag.id}
              className="tag-menu-item"
              onClick={() => {
                onPickTag(tag)
                setOpen(false)
              }}
            >
              <Tag size={15} /> {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
