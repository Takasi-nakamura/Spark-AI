import { jsPDF } from 'jspdf'

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportAsHTML(text, filename = 'spark-ai-output.html') {
  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<title>Spark AI Output</title>
<style>
  body { font-family: "Noto Sans JP", sans-serif; max-width: 720px; margin: 40px auto; line-height: 1.8; padding: 0 16px; color: #17181c; }
  pre { background: #f7f8fb; padding: 12px; border-radius: 12px; overflow-x: auto; }
  code { font-family: monospace; }
</style>
</head>
<body>
<pre>${text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</pre>
</body>
</html>`
  downloadBlob(html, filename, 'text/html;charset=utf-8')
}

export function exportAsCSS(text, filename = 'spark-ai-output.css') {
  const cssBlockMatch = text.match(/```css\n([\s\S]*?)```/)
  const css = cssBlockMatch ? cssBlockMatch[1] : `/* ${text.replace(/\n/g, '\n * ')} */`
  downloadBlob(css, filename, 'text/css;charset=utf-8')
}

export function exportAsPDF(text, filename = 'spark-ai-output.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  const maxWidth = 595 - margin * 2
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.setFontSize(11)
  let y = margin
  lines.forEach((line) => {
    if (y > 800) {
      doc.addPage()
      y = margin
    }
    doc.text(line, margin, y)
    y += 16
  })
  doc.save(filename)
}

export function exportAsCustom(text, extension, filename) {
  const ext = (extension || 'txt').replace(/^\./, '')
  downloadBlob(text, filename || `spark-ai-output.${ext}`, 'text/plain;charset=utf-8')
}

export function exportByFormat(format, text) {
  const normalized = (format || '').toLowerCase()
  if (normalized === 'pdf') return exportAsPDF(text)
  if (normalized === 'html') return exportAsHTML(text)
  if (normalized === 'css') return exportAsCSS(text)
  return exportAsCustom(text, normalized)
}
