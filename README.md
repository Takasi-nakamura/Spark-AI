# Spark AI

Gemini API を使った汎用型AIチャットアプリです。React + Vite で作られており、GitHub Pages で無料公開できます。
このREADMEは**パソコン操作にあまり詳しくない方**でも迷わずセットアップできるよう、手順を省略せずに書いています。上から順番に進めてください。

---

## 目次

1. [事前準備(Node.jsのインストール)](#1-事前準備nodejsのインストール)
2. [プロジェクトの準備](#2-プロジェクトの準備)
3. [依存パッケージのインストール](#3-依存パッケージのインストール)
4. [Gemini APIキーの取得](#4-gemini-apiキーの取得)
5. [手元での起動(開発モード)](#5-手元での起動開発モード)
6. [APIキーをアプリに設定する](#6-apiキーをアプリに設定する)
7. [(任意)アカウント機能を使う場合のFirebase設定](#7-任意アカウント機能を使う場合のfirebase設定)
8. [GitHub Pagesで公開する](#8-github-pagesで公開する)
9. [Spark Code(実験的機能)について](#9-spark-code実験的機能について)
10. [フォルダ構成](#10-フォルダ構成)
11. [よくあるトラブル](#11-よくあるトラブル)

---

## 1. 事前準備(Node.jsのインストール)

このアプリを動かすには「Node.js」というソフトが必要です。

1. [https://nodejs.org/ja](https://nodejs.org/ja) にアクセスします。
2. 「**LTS**」と書かれている方のボタンをクリックしてダウンロードします(推奨版という意味です)。
3. ダウンロードしたインストーラーを開き、指示に従って「次へ」を押し続けてインストールします(基本的にすべて初期設定のままで大丈夫です)。
4. インストールが終わったら、パソコンを再起動しておくと安心です。

**確認方法**: Windowsなら「コマンドプロンプト」、Macなら「ターミナル」を開き、次のコマンドを入力してEnterを押します。

```
node -v
```

`v20.x.x` のようにバージョン番号が表示されればインストール成功です。

---

## 2. プロジェクトの準備

このフォルダ一式(`spark-ai`)を、デスクトップなど分かりやすい場所に置いてください。

次に、ターミナル(コマンドプロンプト)でこのフォルダに移動します。

- 簡単な方法: ターミナルを開いた状態で、`cd ` と入力(末尾に半角スペース)した後、`spark-ai` フォルダをターミナルの画面にドラッグ&ドロップすると、パスが自動入力されます。そのままEnterを押してください。

```
cd (ここにフォルダをドラッグ&ドロップ)
```

---

## 3. 依存パッケージのインストール

フォルダに移動できたら、次のコマンドを実行します。

```
npm install
```

これは「このアプリを動かすのに必要な部品一式をダウンロードする」作業です。少し時間がかかりますが、完了するまで待ってください。

---

## 4. Gemini APIキーの取得

Spark AI は Google の Gemini というAIモデルを使います。利用には無料の「APIキー」が必要です。

1. [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) にアクセスします。
2. Googleアカウントでログインします(お持ちのGmailアカウントでOKです)。
3. 「**Create API key**」または「**APIキーを作成**」ボタンを押します。
4. 表示された文字列(`AIzaSy` から始まる長い文字列)をコピーします。これがAPIキーです。**他人に見せないよう注意してください。**

無料枠の範囲内であれば、追加の支払い設定をしなくても利用できます。

---

## 5. 手元での起動(開発モード)

ターミナルで、プロジェクトのフォルダ内にいる状態のまま、次を実行します。

```
npm run dev
```

しばらくすると、次のような表示が出ます。

```
  Local:   http://localhost:5173/
```

この `http://localhost:5173/` をブラウザ(Google Chromeなど)にコピーして開くと、Spark AIの画面が表示されます。

---

## 6. APIキーをアプリに設定する

1. アプリ左下のアカウントアイコンをクリックして設定画面を開きます。
2. 「**API設定**」タブを開きます。
3. 手順4で取得したAPIキーを貼り付けて「保存する」を押します。

これでチャットが送信できるようになります。APIキーはあなたのブラウザの中だけに保存され、外部には送信されません。

---

## 7. (任意)アカウント機能を使う場合のFirebase設定

アカウント機能(ログイン・新規登録・データ同期)を使わず「ゲスト」のままでも、Spark AIはすべての機能を問題なく使えます。ログイン機能を使いたい場合のみ、以下を行ってください。

1. [https://console.firebase.google.com](https://console.firebase.google.com) にアクセスし、Googleアカウントでログインします。
2. 「プロジェクトを追加」から新しいプロジェクトを作成します(名前は自由です)。
3. 作成したプロジェクトの画面で「Authentication」→「Sign-in method」を開き、「**メール/パスワード**」を有効にします。
4. プロジェクトのトップ画面で「</>(ウェブ)」アイコンを押して、ウェブアプリを登録します。
5. 登録すると `firebaseConfig` というコードが表示されるので、その中の値をコピーします。
6. プロジェクトフォルダ内の `.env.example` をコピーして `.env` という名前のファイルを作り、コピーした値を以下のように貼り付けます。

```
VITE_FIREBASE_API_KEY=コピーしたapiKey
VITE_FIREBASE_AUTH_DOMAIN=コピーしたauthDomain
VITE_FIREBASE_PROJECT_ID=コピーしたprojectId
VITE_FIREBASE_STORAGE_BUCKET=コピーしたstorageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=コピーしたmessagingSenderId
VITE_FIREBASE_APP_ID=コピーしたappId
```

7. `.env` を保存したら、開発サーバーを再起動してください(ターミナルで一度 `Ctrl + C` を押して止め、再度 `npm run dev`)。

これで設定画面の「アカウント設定」からメールアドレスでの新規登録・ログインができるようになります。

---

## 8. GitHub Pagesで公開する

作ったアプリをインターネット上に公開して、スマホなどからもアクセスできるようにする手順です。

### 8-1. GitHubにリポジトリを作る

1. [https://github.com](https://github.com) でアカウントを作成(お持ちならログイン)します。
2. 右上の「+」→「New repository」から新しいリポジトリを作成します。リポジトリ名は好きなもので構いません(例: `spark-ai`)。
3. 作成したリポジトリに、このプロジェクトのファイル一式をアップロードします(GitHub Desktopというアプリを使うと、コマンド操作なしでアップロードできるのでおすすめです → [https://desktop.github.com](https://desktop.github.com))。

### 8-2. 公開パスの設定

`vite.config.js` を開き、次の行を確認します。

```js
base: './',
```

このままでも動きますが、もし表示が崩れる場合は、リポジトリ名に合わせて次のように変更してください(例: リポジトリ名が `spark-ai` の場合)。

```js
base: '/spark-ai/',
```

### 8-3. GitHub Pagesを有効化する

1. GitHub上のリポジトリページで「**Settings**」→ 左メニューの「**Pages**」を開きます。
2. 「Build and deployment」の「Source」を「**GitHub Actions**」に設定します。
3. このプロジェクトには `.github/workflows/deploy.yml` という自動公開の設定ファイルが同梱されています。`main` ブランチにアップロードするだけで、自動的にビルド・公開されます。
4. (Firebaseを使う場合)リポジトリの「Settings」→「Secrets and variables」→「Actions」で、`.env.example` に書かれている `VITE_FIREBASE_...` の各項目をすべて登録しておくと、公開版でもログイン機能が使えます。

数分待つと、「Settings → Pages」の画面に公開URL(`https://ユーザー名.github.io/リポジトリ名/`)が表示されます。

### 8-4. 手動で公開したい場合

コマンドに慣れている場合は、次のコマンド1つでも公開できます。

```
npm run deploy
```

---

## 9. Spark Code(実験的機能)について

Spark Codeは、タグの「+」から「Spark Code」タグを選んで送信すると起動する、本家のClaude Codeのような**エージェントモード**です。AIが実際にファイルを作成・編集し、ターミナルでコマンドまで実行しながらタスクを進めます。

### 9-1. 仕組み(WebContainer API)

本家のClaude Codeはあなたのパソコン上でbashを直接実行しますが、Spark AIはブラウザだけで動くWebアプリのため、代わりに[WebContainer API](https://webcontainers.io/)というStackBlitz社の技術を使っています。これはブラウザの中に本物に近いNode.js環境・ファイルシステム・ターミナルを丸ごと再現する技術で、サーバーを用意しなくても「ブラウザの中でコードを書いて実行する」ことができます。

- Gemini APIの**Function Calling(関数呼び出し)**という機能を使い、AIに`write_file`(ファイル作成)・`read_file`(読み取り)・`delete_file`(削除)・`list_files`(一覧)・`run_command`(コマンド実行)という5つの「道具」を渡しています。
- AIがこれらの道具を選んで呼び出すと、実際にWebContainer上のファイルシステム・ターミナルに対して処理が実行されます。
- 設定 →「タグ」タブの**「Spark Codeの自律実行」**をONにすると、AIが確認なしに連続して作業を進めます(本家Claude Codeの自律実行に近い動き)。OFFの場合は、1つの操作(ファイル書き込みやコマンド実行)ごとに「実行を許可 / 拒否」の確認が入ります。

### 9-2. ブラウザ・ホスティングの制約(重要)

WebContainerは`SharedArrayBuffer`という仕組みを使うため、ブラウザが「クロスオリジン分離」という特別なセキュリティモードになっている必要があります。これには本来、サーバーが以下の2つのHTTPヘッダを返す必要があります。

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

GitHub Pagesはこのヘッダを自分で設定できないため、このプロジェクトには`public/coi-serviceworker.js`という代替の仕組みを同梱しています。これはページを開いた時にService Workerを登録し、疑似的に同じ効果を再現するものです(`index.html`に既に読み込み設定済みなので、追加の作業は不要です)。

それでも動かない場合は、以下を確認してください。

- **対応ブラウザ**: Google Chrome または Microsoft Edge の最新版を推奨します(Safari・Firefoxは対応が不安定な場合があります)。
- Vercel・Netlify・Cloudflare Pagesなど、レスポンスヘッダを自分で設定できるホスティングサービスに切り替えると、より安定して動作します(その場合は`coi-serviceworker.js`は不要になり、各サービスの設定ファイルで上記2つのヘッダを直接指定してください)。
- WebContainer APIは商用利用について規約がある場合があります。個人利用の範囲を超える場合は[https://webcontainers.io/](https://webcontainers.io/)で最新の利用条件をご確認ください。

---

## 10. フォルダ構成

```
spark-ai/
├─ src/
│  ├─ components/    UI部品(サイドバー、チャット画面、設定画面、Spark Codeなど)
│  ├─ lib/           Gemini通信・保存処理・会話履歴・WebContainer制御などのロジック
│  ├─ styles/         デザイン(CSS)
│  ├─ App.jsx         アプリ全体の中心
│  └─ main.jsx        起動ファイル
├─ public/            アイコン、coi-serviceworker.jsなど
├─ .github/workflows/ GitHub Pages自動公開の設定
├─ vite.config.js     ビルド設定(公開パスの調整はここ)
└─ package.json       使用パッケージの一覧
```

---

## 11. よくあるトラブル

**Q. `npm install` でエラーが出る**
→ Node.jsのバージョンが古い可能性があります。手順1からNode.jsを最新のLTS版に入れ直してください。

**Q. チャットを送信してもエラーが表示される**
→ 設定画面の「API設定」でAPIキーが正しく保存されているか確認してください。Gemini APIキー自体は [Google AI Studio](https://aistudio.google.com/app/apikey) の画面で有効になっているかも確認できます。

**Q. GitHub Pagesで公開したらデザインが崩れる/真っ白になる**
→ `vite.config.js` の `base` をリポジトリ名に合わせて設定してください(8-2を参照)。

**Q. スマホで開くと表示がおかしい**
→ ブラウザのキャッシュが残っている場合があります。一度アプリを閉じて再読み込みしてみてください。

**Q. Spark Codeが「実行できません」と表示される**
→ 9章を参照してください。多くの場合はブラウザの対応状況(Chrome/Edge推奨)か、`coi-serviceworker.js`によるcrossOriginIsolatedの有効化がまだ反映されていないことが原因です。ページの再読み込みをもう一度試してください。

---

分からないことがあれば、READMEのどの手順で詰まったかを控えて調べてみてください。開発を楽しんでください。
