/**
 * coi-serviceworker(簡易版)
 *
 * Spark CodeはブラウザでNode.jsを動かすWebContainer APIを使っており、
 * これにはブラウザの「クロスオリジン分離」(Cross-Origin-Embedder-Policy /
 * Cross-Origin-Opener-Policy ヘッダ)が必須です。
 *
 * 通常はホスティングサーバー側でこの2つのHTTPヘッダを付与しますが、
 * GitHub Pagesのようにレスポンスヘッダをカスタマイズできない静的ホスティングでは
 * このService Workerがレスポンスを横取りしてヘッダを追加することで、
 * 同じ効果(疑似的なcrossOriginIsolated)を再現します。
 *
 * 参考: https://github.com/gzuidhof/coi-serviceworker (同種の手法の先行実装)
 */
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting())
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

  self.addEventListener('fetch', (event) => {
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 0) return response
          const newHeaders = new Headers(response.headers)
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          })
        })
        .catch((e) => console.error(e))
    )
  })
} else {
  ;(async () => {
    if (window.crossOriginIsolated !== false) return // 既に分離済み、またはこの手法が不要な環境
    if (!navigator.serviceWorker) {
      console.warn('Spark Code: このブラウザはService Workerに対応していないため、crossOriginIsolatedを有効化できません。')
      return
    }
    const registration = await navigator.serviceWorker.register(window.document.currentScript.src)
    registration.addEventListener('updatefound', () => {
      window.location.reload()
    })
    // 初回登録直後はまだ有効になっていないことがあるため、一度だけ再読み込みする
    if (!sessionStorage.getItem('coiReloadedOnce')) {
      sessionStorage.setItem('coiReloadedOnce', '1')
      window.location.reload()
    }
  })()
}
