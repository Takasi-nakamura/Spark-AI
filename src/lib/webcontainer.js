// Spark Code の実行環境。StackBlitzのWebContainer APIを使い、
// ブラウザの中で本物のNode.js/ファイルシステム/ターミナルを動かす。
// (本家Claude Codeがローカルでbashを実行するのと同じ体験を、サーバー無しで実現するための仕組み)
import { WebContainer } from '@webcontainer/api'

let containerPromise = null

export function isWebContainerLikelySupported() {
  // WebContainerはSharedArrayBufferを必要とし、それにはCOOP/COEPヘッダによる
  // クロスオリジン分離が必須。GitHub Pagesではpublic/coi-serviceworker.jsで代用している。
  return typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated
}

export function getWebContainer() {
  if (!containerPromise) {
    containerPromise = WebContainer.boot()
  }
  return containerPromise
}

export async function wcWriteFile(path, content) {
  const wc = await getWebContainer()
  const parts = path.split('/').filter(Boolean)
  if (parts.length > 1) {
    const dir = parts.slice(0, -1).join('/')
    try {
      await wc.fs.mkdir(dir, { recursive: true })
    } catch {
      // 既に存在する場合は無視
    }
  }
  await wc.fs.writeFile(path, content)
}

export async function wcReadFile(path) {
  const wc = await getWebContainer()
  return await wc.fs.readFile(path, 'utf-8')
}

export async function wcDeleteFile(path) {
  const wc = await getWebContainer()
  await wc.fs.rm(path, { recursive: true, force: true })
}

// 表示用にファイルツリーを再帰的に構築する(node_modules/.git は除外)
export async function wcBuildTree(dir = '.') {
  const wc = await getWebContainer()
  async function walk(current) {
    let entries = []
    try {
      entries = await wc.fs.readdir(current, { withFileTypes: true })
    } catch {
      return []
    }
    const result = []
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git') continue
      const full = current === '.' ? e.name : `${current}/${e.name}`
      if (e.isDirectory()) {
        result.push({ name: e.name, path: full, type: 'dir', children: await walk(full) })
      } else {
        result.push({ name: e.name, path: full, type: 'file' })
      }
    }
    return result.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
  }
  return walk(dir)
}

// コマンドを実行し、標準出力/エラーをリアルタイムで onData に流す。戻り値は終了コード。
export async function wcRunCommand(command, onData) {
  const wc = await getWebContainer()
  const trimmed = command.trim()
  const [cmd, ...args] = trimmed.split(/\s+/)
  const proc = await wc.spawn(cmd, args)
  proc.output.pipeTo(
    new WritableStream({
      write(data) {
        onData?.(data)
      },
    })
  )
  return await proc.exit
}
