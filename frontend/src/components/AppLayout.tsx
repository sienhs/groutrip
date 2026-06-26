import type { ReactNode } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import SideNav from './SideNav';

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
}: AppLayoutProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md md:max-w-5xl">
      {/* 데스크톱 사이드바 — 풀스크린(hideBottomNav)에서는 숨김 */}
      {!hideBottomNav && <SideNav />}

      {/* 본문 컬럼 */}
      <div className="flex min-h-dvh w-full min-w-0 flex-1 flex-col bg-background shadow-sm md:shadow-none">
        {!hideHeader && <Header title={title} showBack={showBack} actions={headerActions} />}
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 md:py-8">{children}</main>
        {!hideBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
