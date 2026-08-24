import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import { MODELS, THINKING_LEVELS } from '../lib/gemini.js'

export default function ModelSelector({ model, setModel, thinkingLevel, setThinkingLevel, boostMode, setBoostMode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const currentModel = MODELS.find((m) => m.id === model) || MODELS[0]

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="model-selector" ref={ref}>
      <button className="model-selector-btn" onClick={() => setOpen((o) => !o)}>
        <span>{currentModel.label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="model-popover">
          <div className="model-popover-section-label">モデル</div>
          {MODELS.map((m) => (
            <button
              key={m.id}
              className={`model-option ${m.id === model ? 'selected' : ''}`}
              onClick={() => {
                setModel(m.id)
              }}
            >
              <span className="model-option-label">{m.label}</span>
              <span className="model-option-hint">{m.hint}</span>
            </button>
          ))}

          <div className="model-popover-section-label">思考度</div>
          <div className="thinking-levels">
            {THINKING_LEVELS.map((t) => (
              <button
                key={t.id}
                className={`thinking-level-btn ${thinkingLevel === t.id ? 'selected' : ''}`}
                onClick={() => setThinkingLevel(t.id)}
                title={t.hint}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            className={`boost-toggle ${boostMode ? 'on' : ''}`}
            onClick={() => setBoostMode(!boostMode)}
          >
            <Zap size={14} />
            <span>強化解決思考モード</span>
            <span className={`switch ${boostMode ? 'on' : ''}`}>
              <span className="switch-knob" />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
