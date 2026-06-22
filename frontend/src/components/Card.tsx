import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** padding 크기 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** 그림자 강조 (예정/진행 강조 카드) */
  elevated?: boolean;
  /** 클릭 가능한 카드(호버 효과 + 커서) */
  interactive?: boolean;
  children: ReactNode;
}

const PAD: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3.5',
  md: 'p-[18px]',
  lg: 'p-6',
};

/** 공통 카드 컨테이너. surface 배경 + 둥근 모서리 + 은은한 테두리. */
export default function Card({
  padding = 'md',
  elevated = false,
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface',
        elevated ? 'shadow-md' : 'shadow-sm',
        interactive &&
          'cursor-pointer transition-shadow transition-transform hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
        PAD[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
