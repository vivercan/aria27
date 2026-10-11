/* ARIA27 service worker (10-Oct-2026)
 * - Notificaciones del telefono (Web Push)
 * - Sin senal: abre las pantallas y muestra lo ultimo que se cargo
 * Nunca guarda respuestas de /api (sesion, escrituras). */
const VERSION = "aria27-v1";
const PAGES = `${VERSION}-pages`, ASSETS = `${VERSION}-assets`, DATA = `${VERSION}-data`;
const PRECACHE = ["/dashboard/campo", "/dashboard/actividades", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const offlineHtml = () => new Response(
  '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#0a1628;color:#c9d8ed;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center"><div><div style="font-size:42px">📶</div><h2 style="color:#fff">Sin señal</h2><p>Abre ARIA27 cuando tengas conexión.<br>Lo que ya habías visto sigue disponible.</p><button onclick="location.reload()" style="margin-top:12px;padding:12px 22px;border:0;border-radius:12px;background:#0073ea;color:#fff;font-weight:700">Reintentar</button></div></body>',
  { headers: { "Content-Type": "text/html; charset=utf-8" } });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Datos de Supabase (lecturas): red primero, si no hay senal lo ultimo guardado
  if (/\.supabase\.co$/.test(url.hostname) && url.pathname.startsWith("/rest/v1/")) {
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(DATA).then((c) => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req).then((m) => m || new Response("[]", { headers: { "Content-Type": "application/json" } }))));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // nunca cachear API
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/fonts/")) {
    e.respondWith(caches.match(req).then((m) => m || fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(ASSETS).then((c) => c.put(req, cp)); } return r; })));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { if (r.ok && url.pathname.startsWith("/dashboard")) { const cp = r.clone(); caches.open(PAGES).then((c) => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req).then((m) => m || caches.match("/dashboard/campo")).then((m) => m || offlineHtml())));
  }
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "ARIA27", body: e.data ? e.data.text() : "" }; }
  const title = d.title || "ARIA27";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png",
    data: { url: d.url || "/dashboard/campo" }, tag: d.tag || undefined, renotify: !!d.tag, vibrate: [60, 30, 60],
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/dashboard/campo";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
