import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { canInstall, promptInstall, isStandalone, isIos, subscribeInstall } from '../../lib/pwa';

/**
 * 홈 화면에 추가(PWA 설치) 섹션.
 * - 크롬 등: 직접 '설치' 버튼 → 설치창 표시(브라우저 기본 배너가 안 떠도 가능).
 * - iOS Safari: 설치 API가 없어 공유 → '홈 화면에 추가' 안내 모달.
 * 이미 설치(독립 실행) 상태면 숨긴다.
 */
export default function InstallSection() {
  const [installable, setInstallable] = useState(canInstall());
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => subscribeInstall(() => setInstallable(canInstall())), []);

  // 이미 앱으로 설치돼 실행 중이면 노출 불필요.
  if (isStandalone()) return null;

  const ios = isIos();
  // 설치 버튼을 띄울 수 없고 iOS도 아니면(이미 설치했거나 미지원 브라우저) 숨긴다.
  if (!installable && !ios) return null;

  const onClick = async () => {
    if (installable) {
      await promptInstall();
    } else {
      setIosOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5 text-left active:scale-[.99]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFCFEB] to-primary text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v10M8 11l4 4 4-4M5 19h14" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold text-foreground">홈 화면에 추가</span>
          <span className="block text-[12px] text-muted">앱처럼 바로 실행할 수 있어요</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-muted">
          <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <Modal open={iosOpen} onClose={() => setIosOpen(false)} title="홈 화면에 추가하기" description="iPhone/iPad에서는 아래 순서로 설치해요.">
        <ol className="space-y-3 text-[14px] text-foreground">
          <li className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">1</span>
            <span>Safari 하단의 <b>공유</b> 버튼
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mx-1 inline align-text-bottom">
                <path d="M12 16V4M8 8l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
              </svg>
              을 눌러요</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">2</span>
            <span><b>홈 화면에 추가</b>를 선택해요</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">3</span>
            <span>오른쪽 위 <b>추가</b>를 누르면 끝!</span>
          </li>
        </ol>
      </Modal>
    </>
  );
}
