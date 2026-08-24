import { useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Info,
  AlertTriangle,
  OctagonAlert,
  CheckCircle2,
  GraduationCap,
  X,
  Check,
  RotateCcw,
} from 'lucide-react'

const CHART_COLORS = ['#4f6bff', '#ffb020', '#2bae66', '#e5484d', '#9b6bff', '#22d3ee', '#ff6bcb', '#b5e853']

export function ChartWidget({ spec }) {
  let parsed
  try {
    parsed = typeof spec === 'string' ? JSON.parse(spec) : spec
  } catch {
    return <div className="widget-error">グラフデータの形式が正しくありません</div>
  }
  const { type = 'bar', title, labels = [], datasets = [] } = parsed
  const data = labels.map((label, i) => {
    const row = { name: label }
    datasets.forEach((ds) => {
      row[ds.label || 'value'] = ds.data?.[i]
    })
    return row
  })

  if (type === 'pie') {
    const pieData = labels.map((label, i) => ({ name: label, value: datasets[0]?.data?.[i] ?? 0 }))
    return (
      <div className="widget chart-widget">
        {title && <div className="widget-title">{title}</div>}
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {pieData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid var(--spark-border)', background: 'var(--spark-bg)' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const isHorizontal = type === 'bar-horizontal'
  const Chart = type === 'line' ? LineChart : BarChart

  return (
    <div className="widget chart-widget">
      {title && <div className="widget-title">{title}</div>}
      <ResponsiveContainer width="100%" height={Math.max(260, isHorizontal ? data.length * 42 : 260)}>
        <Chart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 16, left: isHorizontal ? 12 : 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--spark-border)" />
          {isHorizontal ? (
            <>
              <XAxis type="number" stroke="var(--spark-ink-soft)" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="var(--spark-ink-soft)" fontSize={12} width={90} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" stroke="var(--spark-ink-soft)" fontSize={12} />
              <YAxis stroke="var(--spark-ink-soft)" fontSize={12} />
            </>
          )}
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid var(--spark-border)',
              background: 'var(--spark-bg)',
            }}
          />
          {datasets.length > 1 && <Legend />}
          {datasets.map((ds, i) =>
            type === 'line' ? (
              <Line
                key={ds.label || i}
                type="monotone"
                dataKey={ds.label || 'value'}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
              />
            ) : (
              <Bar
                key={ds.label || i}
                dataKey={ds.label || 'value'}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                radius={isHorizontal ? [0, 8, 8, 0] : [8, 8, 0, 0]}
              />
            )
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  )
}

const ALERT_ICONS = {
  info: Info,
  warning: AlertTriangle,
  danger: OctagonAlert,
  success: CheckCircle2,
}

export function AlertWidget({ spec }) {
  let parsed
  try {
    parsed = typeof spec === 'string' ? JSON.parse(spec) : spec
  } catch {
    return <div className="widget-error">注意ウィジェットの形式が正しくありません</div>
  }
  const { level = 'info', title, text } = parsed
  const Icon = ALERT_ICONS[level] || Info
  return (
    <div className={`widget alert-widget alert-${level}`}>
      <Icon size={18} className="alert-icon" />
      <div>
        {title && <div className="alert-title">{title}</div>}
        {text && <div className="alert-text">{text}</div>}
      </div>
    </div>
  )
}

// ============ テスト(クイズ)ウィジェット ============
// AIが自由に作成した小テストを、白い枠のランチャーから開いて回答→採点できる
export function QuizWidget({ spec }) {
  const [open, setOpen] = useState(false)
  let parsed
  try {
    parsed = typeof spec === 'string' ? JSON.parse(spec) : spec
  } catch {
    return <div className="widget-error">テストの形式が正しくありません</div>
  }
  const { title = 'テスト', questions = [] } = parsed
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(null))
  const [submitted, setSubmitted] = useState(false)

  const choose = (qi, oi) => {
    if (submitted) return
    setAnswers((prev) => {
      const next = [...prev]
      next[qi] = oi
      return next
    })
  }

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0)
  const allAnswered = answers.every((a) => a !== null)

  const reset = () => {
    setAnswers(Array(questions.length).fill(null))
    setSubmitted(false)
  }

  return (
    <>
      <button className="quiz-launcher" onClick={() => setOpen(true)}>
        <GraduationCap size={16} />
        <span>{title}</span>
        <span className="quiz-launcher-count">{questions.length}問</span>
      </button>

      {open && (
        <div className="quiz-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quiz-modal-header">
              <div className="quiz-modal-title">
                <GraduationCap size={18} />
                {title}
              </div>
              <button className="quiz-modal-close" onClick={() => setOpen(false)} aria-label="閉じる">
                <X size={18} />
              </button>
            </div>

            <div className="quiz-modal-body scroll-y">
              {questions.map((q, qi) => (
                <div className="quiz-question" key={qi}>
                  <div className="quiz-question-text">
                    {qi + 1}. {q.question}
                  </div>
                  <div className="quiz-options">
                    {(q.options || []).map((opt, oi) => {
                      const isChosen = answers[qi] === oi
                      const isCorrect = oi === q.correctIndex
                      let stateClass = ''
                      if (submitted) {
                        if (isCorrect) stateClass = 'quiz-option-correct'
                        else if (isChosen && !isCorrect) stateClass = 'quiz-option-wrong'
                      } else if (isChosen) {
                        stateClass = 'quiz-option-selected'
                      }
                      return (
                        <button
                          key={oi}
                          className={`quiz-option ${stateClass}`}
                          onClick={() => choose(qi, oi)}
                          disabled={submitted}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  {submitted && q.explanation && <div className="quiz-explanation">{q.explanation}</div>}
                </div>
              ))}
            </div>

            <div className="quiz-modal-footer">
              {submitted ? (
                <>
                  <div className="quiz-score">
                    <Check size={16} /> {score} / {questions.length} 問正解
                  </div>
                  <button className="quiz-btn quiz-btn-ghost" onClick={reset}>
                    <RotateCcw size={14} /> もう一度
                  </button>
                </>
              ) : (
                <button className="quiz-btn quiz-btn-primary" disabled={!allAnswered} onClick={() => setSubmitted(true)}>
                  採点する
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============ カードウィジェット ============
export function CardWidget({ spec }) {
  let parsed
  try {
    parsed = typeof spec === 'string' ? JSON.parse(spec) : spec
  } catch {
    return <div className="widget-error">カードの形式が正しくありません</div>
  }
  const cards = Array.isArray(parsed) ? parsed : parsed.cards || [parsed]
  return (
    <div className="card-widget-grid">
      {cards.map((c, i) => (
        <div className="info-card" key={i}>
          {c.tag && <div className="info-card-tag">{c.tag}</div>}
          {c.title && <div className="info-card-title">{c.title}</div>}
          {c.description && <div className="info-card-desc">{c.description}</div>}
        </div>
      ))}
    </div>
  )
}

// ============ ボタン(クイックプロンプト)ウィジェット ============
// 押すと対応するプロンプトが入力欄へ自動的に入る
export function ButtonWidget({ spec, onChoose }) {
  let parsed
  try {
    parsed = typeof spec === 'string' ? JSON.parse(spec) : spec
  } catch {
    return <div className="widget-error">ボタンの形式が正しくありません</div>
  }
  const options = Array.isArray(parsed) ? parsed : parsed.options || []
  return (
    <div className="choice-btn-row">
      {options.map((opt, i) => {
        const label = typeof opt === 'string' ? opt : opt.label
        const prompt = typeof opt === 'string' ? opt : opt.prompt || opt.label
        return (
          <button key={i} className="choice-btn" onClick={() => onChoose?.(prompt)}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function StepsWidget({ spec }) {
  let parsed
  try {
    parsed = typeof spec === 'string' ? JSON.parse(spec) : spec
  } catch {
    return <div className="widget-error">ステップの形式が正しくありません</div>
  }
  const steps = Array.isArray(parsed) ? parsed : []
  return (
    <ol className="widget steps-widget">
      {steps.map((s, i) => (
        <li key={i} className="steps-item">
          <span className="steps-num">{i + 1}</span>
          <div>
            <div className="steps-title">{s.title}</div>
            {s.description && <div className="steps-desc">{s.description}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}
