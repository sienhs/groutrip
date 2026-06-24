// enjoy-trip 서비스 워커 — 설치(홈 화면 추가) 가능 요건 충족용 최소 구현.
// 풀 오프라인 캐싱은 아직 범위 외이며, fetch는 네트워크 패스스루로 둔다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // 의도적으로 respondWith 미사용 → 브라우저 기본 네트워크 요청을 그대로 사용.
});
