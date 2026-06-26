import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface HeaderProps {
  /** 미지정 시 GrouTrip 편돌즈 로고 표시 */
  title?: ReactNode;
  /** 뒤로가기 버튼 표시 */
  showBack?: boolean;
  /** 우측 액션(알림 벨 등) */
  actions?: ReactNode;
  /** 스크롤 시 상단 고정 (기본 true) */
  sticky?: boolean;
}

/** 앱 상단 헤더. 로고 또는 페이지 제목 + 뒤로가기 + 우측 액션. */
export default function Header({ title, showBack = false, actions, sticky = true }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-4',
        sticky && 'sticky top-0',
      )}
    >
      {showBack && (
        <button
          type="button"
          aria-label="뒤로가기"
          onClick={() => navigate(-1)}
          className="-ml-1.5 flex size-9 items-center justify-center rounded-button text-foreground hover:bg-black/5"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {title ? (
        <h1 className="truncate text-[16px] font-extrabold tracking-tight text-foreground">{title}</h1>
      ) : (
        <div className="flex items-center gap-2.5 md:hidden">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 21s-7-5.2-7-10.5A7 7 0 0 1 12 3.5a7 7 0 0 1 7 7C19 15.8 12 21 12 21Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="12" cy="10.5" r="2.2" fill="#fff" />
            </svg>
          </span>
          <span className="text-[16px] font-extrabold tracking-tight">GrouTrip <span className="text-muted">편돌즈</span></span>
        </div>
      )}

      {actions && <div className="ml-auto flex items-center gap-1">{actions}</div>}
    </header>
  );
}
