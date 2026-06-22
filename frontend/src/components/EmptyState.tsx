import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** 아이콘 영역(SVG 등). 미지정 시 기본 아이콘. */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** 하단 액션(보통 <Button>) */
  action?: ReactNode;
}

/** 빈 상태 안내. 그룹/보관함/검색결과 없음 등에 사용. */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <div className="mb-3.5 flex size-14 items-center justify-center rounded-2xl bg-[#FFF1E6]">
        {icon ?? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h10" stroke="#FFB585" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <p className="text-[15px] font-extrabold text-[#3A322B]">{title}</p>
      {description && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
