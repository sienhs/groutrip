/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Kakao Maps JS SDK 로더.
 *
 * SDK는 `dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false` 스크립트로 주입하고,
 * `kakao.maps.load(cb)` 로 초기화가 끝나면 resolve 한다. 스크립트는 한 번만 주입한다.
 *
 * ⚠️ 앱키는 카카오 앱의 **JavaScript 키**(VITE_KAKAO_MAP_KEY)여야 하며,
 *    카카오 개발자 콘솔의 "플랫폼 > Web > 사이트 도메인"에 실행 도메인(localhost 포함)을 등록해야 한다.
 *    (백엔드의 REST/모빌리티 키와는 다른 키다.)
 */

export const KAKAO_MAP_KEY: string | undefined = import.meta.env.VITE_KAKAO_MAP_KEY;

let loadPromise: Promise<any> | null = null;

export function loadKakaoMaps(): Promise<any> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!KAKAO_MAP_KEY) {
      reject(new Error('VITE_KAKAO_MAP_KEY 가 설정되지 않았어요(.env.local).'));
      return;
    }
    // 이미 로드됨
    if ((window as any).kakao?.maps) {
      resolve((window as any).kakao);
      return;
    }

    const SCRIPT_ID = 'kakao-maps-sdk';
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    const onReady = () => {
      const kakao = (window as any).kakao;
      if (!kakao?.maps) {
        reject(new Error('Kakao Maps SDK 로드 실패'));
        return;
      }
      kakao.maps.load(() => resolve(kakao));
    };

    if (existing) {
      existing.addEventListener('load', onReady);
      existing.addEventListener('error', () => reject(new Error('Kakao Maps SDK 스크립트 로드 오류')));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false`;
    script.addEventListener('load', onReady);
    script.addEventListener('error', () => reject(new Error('Kakao Maps SDK 스크립트 로드 오류')));
    document.head.appendChild(script);
  });

  return loadPromise;
}
