import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

type Tone = 'primary' | 'neutral' | 'success' | 'danger' | 'info' | 'warning';

const TONE: Record<Tone, string> = {
  primary: 'bg-primary text-primary-foreground',
  neutral: 'bg-[#FFF1E6] text-[#E8742E]',
  success: 'bg-[#DCFCE7] text-[#15803D]',
  danger: 'bg-[#FEE2E2] text-[#B91C1C]',
  info: 'bg-[#DBEAFE] text-[#1D4ED8]',
  warning: 'bg-[#FEF3C7] text-[#B45309]',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

/** 상태/라벨 배지(읽기 전용). OWNER·D-day·진행 상태 등에 사용. */
export default function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold leading-none',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
