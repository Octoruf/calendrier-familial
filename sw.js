/* ============================================================================
   SERVICE WORKER — Notre calendrier familial
   ----------------------------------------------------------------------------
   Rôles :
   1. Pré-cacher les ressources statiques (icônes, manifest, page) pour que
      l'application s'ouvre même hors-ligne.
   2. SERVIR LA PAGE EN "RÉSEAU D'ABORD" : pour index.html on essaie le réseau
      en premier (afin de toujours refléter les données Supabase), puis on
      retombe sur le cache si la connexion est coupée. Les ressources statiques
      (icônes / manifest) sont servies depuis le cache.

   3. NOTIFICATIONS PUSH — PRÉPARÉES MAIS PAS ENCORE ACTIVES.
      Un écouteur 'push' est déjà en place mais il NE fait rien pour l'instant
      (il attend les données d'événement). Pour activer réellement les push,
      il faudra ensuite :
        - renseigner un plugin de notification serveur (ex. Supabase Realtime +
          Edge Functions, ou VAPID via un petit backend),
        - appeler Notification.requestPermission() côté page,
        - récupérer un abonnement PushSubscription via
          registration.pushManager.subscribe(...),
        - et remplir le corps du handler ci-dessous.
      IMPORTANT : les notifications push nécessitent obligatoirement HTTPS
      (ou localhost). Elles ne fonctionneront JAMAIS en ouvrant le fichier en
      file:// ou en HTTP non sécurisé.
   ========================================================================== */

const CACHE_NAME = "calendrier-familial-v1";
// Ressources pré-cacheées au moment de l'installation du service worker.
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

// ---------------------------------------------------------------------------
// INSTALLATION : pré-cache des ressources statiques
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => {
      // Prend le contrôle immédiatement sur les pages déjà ouvertes.
      return self.skipWaiting();
    })
  );
});

// ---------------------------------------------------------------------------
// ACTIVATION : libère les anciens caches
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// FETCH : stratégie de service
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  // On ne gère que les requêtes GET et le protocole http(s).
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.protocol.startsWith("chrome")) return;

  // Navigation (chargement de la page) : réseau d'abord, cache en secours.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // On met à jour le cache avec la dernière version de la page.
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Autres requêtes (icônes, manifest...) : cache d'abord, réseau en secours.
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request)
    )
  );
});

// ---------------------------------------------------------------------------
// NOTIFICATIONS PUSH — PRÉPARÉES, PAS ENCORE ACTIVES
// ---------------------------------------------------------------------------
// Lorsque le serveur envoie un push, cet événement est déclenché. Pour l'instant
// on se contente de logguer. C'est ICI qu'il faudra implémenter l'affichage de
// la notification (self.registration.showNotification(...)).
self.addEventListener("push", (event) => {
  // Le serveur devra envoyer un JSON : { title, body, url }.
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : "Un événement familial a été mis à jour." };
  }
  const title = data.title || "Calendrier familial";
  const options = {
    body: data.body || "Un événement familial a été mis à jour.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: { url: data.url || "./" },
    tag: data.tag || "calendrier-familial"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Au clic sur une notification, on ouvre l'application.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return clients.openWindow(event.notification.data?.url || "./");
    })
  );
});