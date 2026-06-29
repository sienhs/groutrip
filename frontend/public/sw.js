// enjoy-trip 서비스 워커 — 설치(홈 화면 추가) 가능 요건 충족용 최소 구현.
// 풀 오프라인 캐싱은 아직 범위 외이며, fetch는 네트워크 패스스루로 둔다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // 의도적으로 respondWith 미사용 → 브라우저 기본 네트워크 요청을 그대로 사용.
});

self.addEventListener('push', (event) => {
  let data = { title: 'Groutrip', body: '새 알림이 있어요.', url: '/' };
  try {
    if (event.data) Object.assign(data, event.data.json());
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      data: { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          client.focus();
          client.navigate(target);
          return;
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
