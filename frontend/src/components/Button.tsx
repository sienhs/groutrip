import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-hover',
  secondary:
    'bg-surface text-[#C25478] border border-[#FFCFEB] hover:bg-[#FBF2FC] active:bg-[#FFEDF7]',
  danger:
    'bg-danger text-white shadow-sm hover:bg-[#DC2626] active:bg-[#B91C1C]',
  ghost:
    'bg-transparent text-muted hover:bg-black/5 active:bg-black/10',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-14 px-6 text-base gap-2.5',
};

/** 공통 버튼. variant / size / loading / disabled / fullWidth 지원. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-button font-bold leading-none',
        'transition-colors select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:bg-[#EEECF6] disabled:text-[#B6B1C4] disabled:border-transparent disabled:shadow-none',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current/40 border-t-current"
        />
      )}
      {children}
    </button>
  );
});

export default Button;
