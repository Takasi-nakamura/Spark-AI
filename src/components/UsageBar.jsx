import { USAGE_LIMIT } from '../lib/storage.js'

function formatRemaining(windowStart, windowMs) {
  const remaining = windowStart + windowMs - Date.now()
  if (remaining <= 0) return 'まもなくリセット'
  const h = Math.floor(remaining / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  return `残り${h}時間${m}分でリセット`
}

export default function UsageBar({ usage, windowMs }) {
  const ratio = Math.min(1, usage.count / USAGE_LIMIT)
  let colorClass = 'usage-blue'
  if (ratio >= 0.85) colorClass = 'usage-red'
  else if (ratio >= 0.6) colorClass = 'usage-yellow'

  return (
    <div className="usage-block">
      <div className="usage-labels">
        <span>今のウィンドウの使用量</span>
        <span>
          {usage.count} / {USAGE_LIMIT}
        </span>
      </div>
      <div className="usage-track">
        <div className={`usage-fill ${colorClass}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="usage-reset-text">{formatRemaining(usage.windowStart, windowMs)}</div>
    </div>
  )
}
