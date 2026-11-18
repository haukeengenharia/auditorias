/* Service worker: guarda o app no celular para abrir sem internet.
   Ao publicar uma nova versão, aumente o número em VERSAO para os celulares atualizarem. */
const VERSAO = 'auditorias-v1';
const ARQUIVOS = [
  './', './index.html', './app.js', './modelo.js', './config.js',
  './manifest.webmanifest', './vendor/jspdf.umd.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Só arquivos do próprio app; Apps Script e busca de endereço vão direto para a rede.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Abre na hora pelo cache (sinal fraco no cliente não trava o app) e atualiza em segundo plano;
  // a versão nova aparece na próxima vez que o app for aberto.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      const rede = fetch(e.request).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, cp)); }
        return r;
      }).catch(() => cached || caches.match('./index.html'));
      return cached || rede;
    })
  );
});
