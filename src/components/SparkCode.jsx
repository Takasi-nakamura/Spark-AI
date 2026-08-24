import { useEffect, useRef, useState } from 'react'
import {
  X,
  TerminalSquare,
  FolderTree,
  FileCode2,
  Loader2,
  Check,
  Ban,
  Send,
  AlertTriangle,
} from 'lucide-react'
import { HighlightedCode } from './CodeBlock.jsx'
import { callGeminiStep } from '../lib/gemini.js'
import { SPARK_CODE_TOOLS, describeCall } from '../lib/sparkCodeTools.js'
import {
  getWebContainer,
  isWebContainerLikelySupported,
  wcWriteFile,
  wcReadFile,
  wcDeleteFile,
  wcBuildTree,
  wcRunCommand,
} from '../lib/webcontainer.js'

const MAX_AUTO_STEPS = 25

const SYSTEM_INSTRUCTION = `あなたはSpark Codeです。Claude Codeのようなエージェント型のコーディングアシスタントとして、
実際にブラウザ内のNode.js環境(WebContainer)でファイルの作成・編集・削除やコマンド実行を行いながらタスクを進めます。
与えられた道具(write_file, read_file, delete_file, list_files, run_command)を使って、一歩ずつ確実にタスクを進めてください。
大きな変更は複数の小さなステップに分けてください。作業が完了したら、道具を呼び出さずに、完了した内容を日本語で簡潔に報告してください。`

function detectLang(path) {
  const ext = path.split('.').pop()?.toLowerCase()
  const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown', sh: 'bash' }
  return map[ext] || 'text'
}

function FileTree({ nodes, selected, onSelect, depth = 0 }) {
  return (
    <>
      {nodes.map((n) => (
        <div key={n.path}>
          <button
            className={`spc-file-item ${selected === n.path ? 'active' : ''}`}
            style={{ paddingLeft: 10 + depth * 14 }}
            onClick={() => n.type === 'file' && onSelect(n.path)}
          >
            {n.type === 'dir' ? <FolderTree size={13} /> : <FileCode2 size={13} />}
            <span>{n.name}</span>
          </button>
          {n.type === 'dir' && n.children?.length > 0 && (
            <FileTree nodes={n.children} selected={selected} onSelect={onSelect} depth={depth + 1} />
          )}
        </div>
      ))}
    </>
  )
}

export default function SparkCode({ session, apiKey, modelId, autonomous, onClose }) {
  const [status, setStatus] = useState('booting') // booting | unsupported | error | ready
  const [bootError, setBootError] = useState('')
  const [log, setLog] = useState([]) // {type:'text'|'call'|'result'|'error', ...}
  const [tree, setTree] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [pendingCall, setPendingCall] = useState(null)
  const [busy, setBusy] = useState(false)
  const [followUp, setFollowUp] = useState('')
  const contentsRef = useRef([])
  const stepCountRef = useRef(0)
  const logEndRef = useRef(null)
  const abortRef = useRef(false)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  const refreshTree = async () => {
    try {
      const t = await wcBuildTree('.')
      setTree(t)
    } catch {
      // まだブート前などは無視
    }
  }

  const appendLog = (entry) => setLog((prev) => [...prev, entry])

  const executeCall = async (call) => {
    const { name, args = {} } = call
    try {
      if (name === 'write_file') {
        await wcWriteFile(args.path, args.content ?? '')
        await refreshTree()
        return { ok: true, message: `${args.path} に書き込みました` }
      }
      if (name === 'read_file') {
        const content = await wcReadFile(args.path)
        return { ok: true, content }
      }
      if (name === 'delete_file') {
        await wcDeleteFile(args.path)
        await refreshTree()
        return { ok: true, message: `${args.path} を削除しました` }
      }
      if (name === 'list_files') {
        const t = await wcBuildTree(args.path || '.')
        return { ok: true, entries: t.map((n) => ({ name: n.name, type: n.type })) }
      }
      if (name === 'run_command') {
        appendLog({ type: 'cmd-start', command: args.command, id: Date.now() })
        let outputBuf = ''
        const exitCode = await wcRunCommand(args.command, (chunk) => {
          outputBuf += chunk
          setLog((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last && last.type === 'cmd-start' && last.command === args.command) {
              next[next.length - 1] = { ...last, output: outputBuf }
            }
            return next
          })
        })
        await refreshTree()
        return { ok: exitCode === 0, exitCode, output: outputBuf.slice(-4000) }
      }
      return { ok: false, error: `未知のツール: ${name}` }
    } catch (err) {
      return { ok: false, error: String(err?.message || err) }
    }
  }

  const runLoop = async () => {
    if (abortRef.current) return
    setBusy(true)
    try {
      while (stepCountRef.current < MAX_AUTO_STEPS) {
        stepCountRef.current += 1
        const { text, functionCalls, parts } = await callGeminiStep({
          apiKey,
          modelId,
          contents: contentsRef.current,
          systemInstructionText: SYSTEM_INSTRUCTION,
          tools: SPARK_CODE_TOOLS,
        })

        contentsRef.current = [...contentsRef.current, { role: 'model', parts }]

        if (text) appendLog({ type: 'text', text })

        if (!functionCalls || functionCalls.length === 0) {
          break // タスク完了、またはツールを使わない普通の応答
        }

        for (const call of functionCalls) {
          if (!autonomous) {
            const approved = await new Promise((resolve) => {
              setPendingCall({ call, resolve })
            })
            setPendingCall(null)
            if (!approved) {
              contentsRef.current = [
                ...contentsRef.current,
                {
                  role: 'function',
                  parts: [{ functionResponse: { name: call.name, response: { ok: false, error: 'ユーザーがこの操作を拒否しました' } } }],
                },
              ]
              appendLog({ type: 'result', name: call.name, ok: false, message: 'ユーザーが拒否しました' })
              continue
            }
          }
          appendLog({ type: 'call', call })
          const result = await executeCall(call)
          appendLog({ type: 'result', name: call.name, ...result })
          contentsRef.current = [
            ...contentsRef.current,
            { role: 'function', parts: [{ functionResponse: { name: call.name, response: result } }] },
          ]
        }
      }
    } catch (err) {
      appendLog({ type: 'error', text: String(err?.message || err) })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!isWebContainerLikelySupported()) {
        setStatus('unsupported')
        return
      }
      try {
        await getWebContainer()
        if (cancelled) return
        setStatus('ready')
        await refreshTree()
        contentsRef.current = [{ role: 'user', parts: [{ text: session.task }] }]
        appendLog({ type: 'text', text: `タスクを開始します: ${session.task}` })
        runLoop()
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setBootError(String(err?.message || err))
        }
      }
    }
    boot()
    return () => {
      cancelled = true
      abortRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openFile = async (path) => {
    setSelectedFile(path)
    try {
      const content = await wcReadFile(path)
      setFileContent(content)
    } catch {
      setFileContent('(このファイルは読み込めませんでした)')
    }
  }

  const handleFollowUpSend = () => {
    const text = followUp.trim()
    if (!text || busy) return
    setFollowUp('')
    contentsRef.current = [...contentsRef.current, { role: 'user', parts: [{ text }] }]
    appendLog({ type: 'text', text: `> ${text}`, own: true })
    stepCountRef.current = 0
    runLoop()
  }

  return (
    <div className="spc-overlay">
      <div className="spc-shell">
        <div className="spc-header">
          <div className="spc-header-title">
            <TerminalSquare size={17} />
            <span>Spark Code</span>
            {busy && <Loader2 size={14} className="spc-spin" />}
          </div>
          <button className="wsp-close" onClick={onClose} aria-label="閉じる">
            <X size={16} />
          </button>
        </div>

        {status === 'unsupported' && (
          <div className="spc-notice">
            <AlertTriangle size={18} />
            <div>
              このブラウザ/このページの配信設定では Spark Code(WebContainer)を実行できません。
              クロスオリジン分離(COOP/COEP)が必要です。GitHub Pagesで公開している場合は
              README記載の coi-serviceworker の設定を確認し、ページを再読み込みしてください。
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="spc-notice">
            <AlertTriangle size={18} />
            <div>起動に失敗しました: {bootError}</div>
          </div>
        )}
        {status === 'booting' && (
          <div className="spc-notice">
            <Loader2 size={18} className="spc-spin" />
            <div>Spark Codeの実行環境を起動しています…(初回は少し時間がかかります)</div>
          </div>
        )}

        {status === 'ready' && (
          <div className="spc-body">
            <div className="spc-sidebar">
              <div className="spc-sidebar-title">
                <FolderTree size={13} /> ファイル
              </div>
              <div className="spc-file-list scroll-y">
                {tree.length === 0 && <div className="wsp-empty">まだファイルはありません</div>}
                <FileTree nodes={tree} selected={selectedFile} onSelect={openFile} />
              </div>
            </div>

            <div className="spc-main">
              {selectedFile ? (
                <div className="spc-file-view">
                  <div className="wsp-file-view-header">
                    <span className="wsp-file-view-path">{selectedFile}</span>
                    <button className="wsp-mini-btn" onClick={() => setSelectedFile(null)}>
                      ターミナルに戻る
                    </button>
                  </div>
                  <pre className="wsp-file-pre">
                    <code>
                      <HighlightedCode code={fileContent} lang={detectLang(selectedFile)} />
                    </code>
                  </pre>
                </div>
              ) : (
                <div className="spc-terminal scroll-y">
                  {log.map((entry, i) => {
                    if (entry.type === 'text') {
                      return (
                        <div key={i} className={`spc-log-text ${entry.own ? 'own' : ''}`}>
                          {entry.text}
                        </div>
                      )
                    }
                    if (entry.type === 'call') {
                      return (
                        <div key={i} className="spc-log-call">
                          <TerminalSquare size={12} /> {describeCall(entry.call)}
                        </div>
                      )
                    }
                    if (entry.type === 'cmd-start') {
                      return (
                        <div key={i} className="spc-log-cmd">
                          <div className="wsp-terminal-cmd">
                            <span className="wsp-terminal-prompt">$</span> {entry.command}
                          </div>
                          {entry.output && <pre className="wsp-terminal-output">{entry.output}</pre>}
                        </div>
                      )
                    }
                    if (entry.type === 'result') {
                      return (
                        <div key={i} className={`spc-log-result ${entry.ok ? 'ok' : 'fail'}`}>
                          {entry.ok ? <Check size={12} /> : <Ban size={12} />}
                          {entry.message || (entry.ok ? '完了しました' : entry.error || '失敗しました')}
                        </div>
                      )
                    }
                    if (entry.type === 'error') {
                      return (
                        <div key={i} className="spc-log-result fail">
                          <AlertTriangle size={12} /> {entry.text}
                        </div>
                      )
                    }
                    return null
                  })}
                  <div ref={logEndRef} />
                </div>
              )}

              {pendingCall && (
                <div className="spc-approval">
                  <span>
                    <AlertTriangle size={14} /> 確認: {describeCall(pendingCall.call)}
                  </span>
                  <div className="spc-approval-actions">
                    <button className="quiz-btn quiz-btn-ghost" onClick={() => pendingCall.resolve(false)}>
                      拒否
                    </button>
                    <button className="quiz-btn quiz-btn-primary" onClick={() => pendingCall.resolve(true)}>
                      実行を許可
                    </button>
                  </div>
                </div>
              )}

              <div className="spc-followup">
                <input
                  className="regen-submenu-input spc-followup-input"
                  placeholder="Spark Codeに追加の指示を送る…"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFollowUpSend()}
                  disabled={busy}
                />
                <button className="regen-submenu-go" onClick={handleFollowUpSend} disabled={busy || !followUp.trim()}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
