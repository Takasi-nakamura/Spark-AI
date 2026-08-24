// Spark Code がGeminiのFunction Callingで使う「道具」の定義。
// ここで宣言した名前・引数の形をAIに渡し、AIが選んだ呼び出しをwebcontainer.js経由で実際に実行する。

export const SPARK_CODE_TOOLS = [
  {
    name: 'write_file',
    description: 'プロジェクト内にファイルを新規作成、または既存ファイルを上書きする',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '相対パス(例: src/App.jsx)' },
        content: { type: 'string', description: 'ファイルに書き込む内容全体' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: '既存ファイルの中身を読み取る',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '相対パス' },
      },
      required: ['path'],
    },
  },
  {
    name: 'delete_file',
    description: 'ファイルまたはディレクトリを削除する',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '相対パス' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_files',
    description: '指定ディレクトリ配下のファイル一覧を取得する',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '相対パス(省略時はプロジェクト直下)' },
      },
    },
  },
  {
    name: 'run_command',
    description: 'ターミナルでコマンドを実行する(npm install や node index.js など)',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: '実行するコマンド全体(例: npm install express)' },
      },
      required: ['command'],
    },
  },
]

export function describeCall(call) {
  const a = call.args || {}
  switch (call.name) {
    case 'write_file':
      return `${a.path} を書き込む`
    case 'read_file':
      return `${a.path} を読み取る`
    case 'delete_file':
      return `${a.path} を削除する`
    case 'list_files':
      return `${a.path || '.'} の一覧を取得する`
    case 'run_command':
      return `$ ${a.command}`
    default:
      return call.name
  }
}
