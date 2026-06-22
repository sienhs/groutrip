import type { ReactNode } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';

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
 * 인증 후 화면의 공통 셸: 헤더 + 본문 + 모바일 하단 탭.
 * 모바일 우선이며 최대 너비(md)로 중앙 정렬해 데스크톱에서도 자연스럽게.
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background shadow-sm md:max-w-lg">
      {!hideHeader && <Header title={title} showBack={showBack} actions={headerActions} />}
      <main className="flex-1 px-4 py-5">{children}</main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
