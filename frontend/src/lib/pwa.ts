// PWA "홈 화면에 추가" 설치 지원.
// 크롬은 beforeinstallprompt를 가로채 우리가 원하는 시점에 직접 설치창을 띄울 수 있다.
// (브라우저 기본 배너가 안 뜨는 사용자도 버튼으로 설치 가능)
// iOS Safari는 beforeinstallprompt가 없어 공유 → '홈 화면에 추가' 안내가 필요하다.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// 모듈 로드 시점(앱 부팅)에 바로 등록해야 이벤트를 놓치지 않는다.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // 브라우저 기본 미니 배너 억제 → 우리가 버튼으로 제어
  deferredPrompt = e as BeforeInstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  notify();
});

/** 크롬 등에서 직접 설치창을 띄울 수 있는 상태인지. */
export const canInstall = (): boolean => deferredPrompt !== null;

/** 직접 설치창 표시. 수락되면 true. */
export const promptInstall = async (): Promise<boolean> => {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return outcome === 'accepted';
};

/** 이미 설치(독립 실행)된 상태인지. */
export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

/** iOS(Safari)는 직접 설치 API가 없어 수동 안내가 필요하다. */
export const isIos = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

/** 설치 가능 상태 변화 구독(버튼 노출 갱신용). */
export const subscribeInstall = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};
