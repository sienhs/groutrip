import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface TabItem {
  key: string;
  label: ReactNode;
  /** 우측 카운트 배지 등 */
  badge?: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * 하단 보더형 탭(controlled). 그룹 허브 내부(일정/장소/투표/정산/멤버) 전환에 사용.
 * 가로 스크롤 가능, role=tablist 접근성.
 */
export default function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label="그룹 탭"
      className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}
    >
      {items.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-3 text-[14px] font-bold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              active
                ? 'border-primary text-[#E8742E]'
                : 'border-transparent text-muted hover:text-muted',
            )}
          >
            {t.label}
            {t.badge != null && (
              <span
                className={cn(
                  'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold',
                  active ? 'bg-primary text-primary-foreground' : 'bg-[#F0E4D6] text-[#8A7B6B]',
                )}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
