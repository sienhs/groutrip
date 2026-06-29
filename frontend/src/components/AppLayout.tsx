import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import Header from './Header';
import BottomNav from './BottomNav';
import SideNav from './SideNav';
import ErrorBoundary from './ErrorBoundary';

interface AppLayoutProps {
  children: ReactNode;
  /** 헤더 제목(미지정 시 로고) */
  title?: ReactNode;
  /** 헤더 뒤로가기 표시 */
  showBack?: boolean;
  /** 헤더 우측 액션 */
  headerActions?: ReactNode;
  /** 하단 탭 숨김(로그인/상세 풀스크린 등) */
  hideBottomNav?: boolean;
  /** 헤더 숨김 */
  hideHeader?: boolean;
  /** 본문 패딩·최대폭 제거하고 풀높이 컬럼으로(채팅 등 전체화면 콘텐츠용) */
  bleed?: boolean;
}

/**
 * 인증 후 화면의 공통 셸.
 * - 모바일: 단일 컬럼(헤더 + 본문 + 하단 탭).
 * - 데스크톱(md+): 좌측 사이드바 + 넓은 본문 프레임으로 분기(하단 탭 숨김).
 * 본문은 가독성을 위해 max-w-2xl로 제한해 데스크톱에서도 한 손 너비를 유지한다.
 */
export default function AppLayout({
  children,
  title,
  showBack = false,
  headerActions,
  hideBottomNav = false,
  hideHeader = false,
  bleed = false,
}: AppLayoutProps) {
  return (
    // 모바일: max-w-md 단일 컬럼 중앙 정렬. 데스크톱(md+): 사이드바 + 본문이 창 전체 너비를 채운다.
    // 화면 높이를 고정(min-h-dvh→h-dvh, overflow-hidden)해 bleed 콘텐츠(채팅)가 내부 스크롤만 갖도록 한다.
    <div className={cn('mx-auto flex w-full max-w-md md:max-w-none', bleed ? 'h-dvh overflow-hidden' : 'min-h-dvh')}>
      {/* 데스크톱 사이드바 — 풀스크린(hideBottomNav)에서는 숨김 */}
      {!hideBottomNav && <SideNav />}

      {/* 본문 컬럼 */}
      <div className={cn('flex w-full min-w-0 flex-1 flex-col bg-background shadow-sm md:shadow-none', bleed ? 'h-full min-h-0' : 'min-h-dvh')}>
        {!hideHeader && <Header title={title} showBack={showBack} actions={headerActions} />}
        {bleed ? (
          // 패딩·최대폭 없이 남은 높이를 모두 차지하는 풀높이 컬럼(내부에서 스크롤/입력창 고정 처리)
          <main className="flex min-h-0 w-full flex-1 flex-col">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        ) : (
          // 본문 폭은 창 크기에 따라 단계적으로 넓어진다(가독성을 위해 상한은 둔다).
          <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 md:px-6 md:py-8 lg:max-w-4xl lg:px-8 2xl:max-w-5xl">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        )}
        {!hideBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
