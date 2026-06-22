import { cn } from '../lib/cn';

interface SkeletonProps {
  className?: string;
  /** 형태 프리셋 */
  variant?: 'line' | 'circle' | 'rect';
}

/**
 * 로딩 스켈레톤. 크기는 className 의 w-/h-/size- 로 지정.
 * 펄스 애니메이션은 Tailwind animate-pulse 사용.
 */
export default function Skeleton({ className, variant = 'line' }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse bg-[#F0E4D6]',
        variant === 'line' && 'h-3 w-full rounded-md',
        variant === 'circle' && 'size-10 rounded-full',
        variant === 'rect' && 'h-12 w-full rounded-card',
        className,
      )}
    />
  );
}

/** 카드 한 장 형태의 스켈레톤(목록 로딩용). */
export function SkeletonCard() {
  return (
    <div className="rounded-card border border-border bg-surface p-[18px] shadow-sm" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton variant="rect" className="size-12 shrink-0" />
        <div className="flex-1">
          <Skeleton className="w-2/3" />
          <Skeleton className="mt-2.5 h-2.5 w-2/5" />
        </div>
      </div>
      <Skeleton className="mt-4 h-2.5" />
      <Skeleton className="mt-2.5 h-2.5 w-5/6" />
    </div>
  );
}
