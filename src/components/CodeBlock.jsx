import { useState, useMemo } from 'react'
import { Copy, Download, Check, Code2, Eye } from 'lucide-react'

const PREVIEWABLE = ['html', 'htm', 'svg']

function extensionFor(lang) {
  const map = {
    javascript: 'js',
    typescript: 'ts',
    jsx: 'jsx',
    tsx: 'tsx',
    python: 'py',
    html: 'html',
    css: 'css',
    json: 'json',
    bash: 'sh',
    shell: 'sh',
    yaml: 'yml',
    ruby: 'rb',
    go: 'go',
    rust: 'rs',
    cpp: 'cpp',
    c: 'c',
    php: 'php',
    sql: 'sql',
    java: 'java',
  }
  return map[lang?.toLowerCase()] || (lang ? lang.toLowerCase() : 'txt')
}

// ============ 軽量シンタックスハイライター ============
// 外部パッケージなしで、公式エディタ配色に近い「鮮やかな」トークン分けを行う。
const ALIASES = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  rb: 'ruby',
  rs: 'rust',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  md: 'markdown',
}

const KEYWORDS = {
  javascript:
    'const let var function return if else for while class extends import from export default new this try catch finally throw await async switch case break continue typeof instanceof of in null undefined true false static get set yield do',
  typescript:
    'const let var function return if else for while class extends implements interface type public private protected readonly enum namespace as import from export default new this try catch finally throw await async switch case break continue typeof instanceof of in null undefined true false static get set yield do satisfies',
  python:
    'def return if elif else for while class import from as try except finally with lambda pass break continue yield global nonlocal not and or is in None True False async await raise del print self',
  java:
    'public private protected class interface extends implements static final void int double float boolean char long short byte String new return if else for while switch case break continue try catch finally throw import package this super true false null',
  csharp:
    'public private protected class interface static void int double float bool string new return if else for while switch case break continue try catch finally throw using namespace this base true false null async await var',
  bash: 'if then fi for do done while echo export function return case esac local in',
  sql: 'select from where insert into values update set delete join on group by order limit as and or not null create table drop alter',
  php: 'function return if else foreach as while class new echo print public private protected static true false null array use namespace',
  go: 'func return if else for range package import var const type struct interface map true false nil defer go chan select switch case',
  rust: 'fn let mut return if else for while loop match struct enum impl pub use mod true false None Some Ok Err self',
  c: 'int char float double void return if else for while switch case break continue struct typedef include define static const sizeof',
  cpp: 'int char float double void return if else for while switch case break continue class struct public private protected new delete namespace using template true false nullptr auto',
  swift: 'func let var return if else for while class struct enum protocol extension import guard switch case break continue true false nil self',
  kotlin: 'fun val var return if else for while class object interface import when true false null this',
}

function tokenizeGeneric(code, lang) {
  const kw = KEYWORDS[lang]
  const kwRe = kw ? new RegExp(`\\b(${kw.trim().split(/\s+/).join('|')})\\b`) : null
  const commentRe =
    lang === 'python' || lang === 'bash' || lang === 'ruby' || lang === 'yaml'
      ? /#.*$/m
      : lang === 'sql'
        ? /--.*$/m
        : /\/\/[^\n]*|\/\*[\s\S]*?\*\//

  const master = new RegExp(
    [
      commentRe.source,
      /"(?:\\.|[^"\\\n])*"/.source,
      /'(?:\\.|[^'\\\n])*'/.source,
      /`(?:\\.|[^`\\])*`/.source,
      /\b0x[0-9a-fA-F]+\b|\b\d+(\.\d+)?\b/.source,
      kwRe ? kwRe.source : '(?!x)x',
      /\b[A-Za-z_$][\w$]*(?=\s*\()/.source,
      /[{}[\]();,.:]/.source,
    ].join('|'),
    'gm'
  )

  const out = []
  let last = 0
  let m
  while ((m = master.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index), c: null })
    const text = m[0]
    let cls
    if (new RegExp(`^(?:${commentRe.source})$`).test(text)) cls = 'comment'
    else if (/^["'`]/.test(text)) cls = 'string'
    else if (/^(0x|\d)/.test(text)) cls = 'number'
    else if (kwRe && new RegExp(`^(?:${kwRe.source})$`).test(text)) cls = 'keyword'
    else if (/^[{}[\]();,.:]$/.test(text)) cls = 'punct'
    else cls = 'function'
    out.push({ t: text, c: cls })
    last = master.lastIndex
  }
  if (last < code.length) out.push({ t: code.slice(last), c: null })
  return out
}

function tokenizeMarkupLike(code) {
  const re = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z][\w:-]*)|([a-zA-Z-]+)(?=\s*=)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\/?>)/g
  const out = []
  let last = 0
  let m
  while ((m = re.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index), c: null })
    if (m[1]) out.push({ t: m[1], c: 'comment' })
    else if (m[2]) out.push({ t: m[2], c: 'tag' })
    else if (m[3]) out.push({ t: m[3], c: 'attr' })
    else if (m[4] || m[5]) out.push({ t: m[4] || m[5], c: 'string' })
    else if (m[6]) out.push({ t: m[6], c: 'tag' })
    last = re.lastIndex
  }
  if (last < code.length) out.push({ t: code.slice(last), c: null })
  return out
}

function tokenizeCss(code) {
  const re = /(\/\*[\s\S]*?\*\/)|([.#]?[a-zA-Z-][\w-]*)(?=\s*[{,])|([a-zA-Z-]+)(?=\s*:)|(:\s*)([^;{}]+)(;)?|(".*?"|'.*?')/g
  const out = []
  let last = 0
  let m
  while ((m = re.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index), c: null })
    if (m[1]) out.push({ t: m[1], c: 'comment' })
    else if (m[2]) out.push({ t: m[2], c: 'tag' })
    else if (m[3]) out.push({ t: m[3], c: 'attr' })
    else if (m[7]) out.push({ t: m[7], c: 'string' })
    else if (m[4]) {
      out.push({ t: m[4], c: null })
      if (m[5]) out.push({ t: m[5], c: 'number' })
      if (m[6]) out.push({ t: m[6], c: null })
    }
    last = re.lastIndex
  }
  if (last < code.length) out.push({ t: code.slice(last), c: null })
  return out
}

function tokenizeJson(code) {
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\b\d+(\.\d+)?\b)/g
  const out = []
  let last = 0
  let m
  while ((m = re.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index), c: null })
    if (m[1]) {
      out.push({ t: m[1], c: m[2] ? 'attr' : 'string' })
      if (m[2]) out.push({ t: m[2], c: null })
    } else if (m[3]) out.push({ t: m[3], c: 'keyword' })
    else if (m[4]) out.push({ t: m[4], c: 'number' })
    last = re.lastIndex
  }
  if (last < code.length) out.push({ t: code.slice(last), c: null })
  return out
}

function highlight(code, rawLang) {
  const lang = ALIASES[rawLang?.toLowerCase()] || rawLang?.toLowerCase()
  try {
    if (lang === 'html' || lang === 'xml' || lang === 'svg') return tokenizeMarkupLike(code)
    if (lang === 'css' || lang === 'scss' || lang === 'less') return tokenizeCss(code)
    if (lang === 'json') return tokenizeJson(code)
    return tokenizeGeneric(code, lang)
  } catch {
    return [{ t: code, c: null }]
  }
}

export function HighlightedCode({ code, lang }) {
  const tokens = useMemo(() => highlight(code, lang), [code, lang])
  return (
    <>
      {tokens.map((tok, i) =>
        tok.c ? (
          <span key={i} className={`tok-${tok.c}`}>
            {tok.t}
          </span>
        ) : (
          <span key={i}>{tok.t}</span>
        )
      )}
    </>
  )
}

export default function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState('code')
  const lang = (language || 'text').toLowerCase()
  const canPreview = PREVIEWABLE.includes(lang)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // クリップボード権限が無い場合は無視
    }
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${extensionFor(lang)}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="codeblock">
      <div className="codeblock-header">
        <span className="codeblock-lang">{lang}</span>
        <div className="codeblock-actions">
          {canPreview && (
            <button
              className="codeblock-btn"
              onClick={() => setMode(mode === 'code' ? 'preview' : 'code')}
              title={mode === 'code' ? 'プレビュー表示' : 'コード表示'}
            >
              {mode === 'code' ? <Eye size={14} /> : <Code2 size={14} />}
              {mode === 'code' ? 'プレビュー' : 'コード'}
            </button>
          )}
          <button className="codeblock-btn" onClick={handleCopy} title="コピー">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'コピー済み' : 'コピー'}
          </button>
          <button className="codeblock-btn" onClick={handleDownload} title="ダウンロード">
            <Download size={14} />
            保存
          </button>
        </div>
      </div>
      {mode === 'preview' && canPreview ? (
        <iframe
          className="codeblock-preview"
          title="コードプレビュー"
          sandbox="allow-scripts"
          srcDoc={code}
        />
      ) : (
        <pre className="codeblock-pre">
          <code>
            <HighlightedCode code={code} lang={lang} />
          </code>
        </pre>
      )}
    </div>
  )
}
