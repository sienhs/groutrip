import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: ReactNode;
  helper?: ReactNode;
  /** 우측 아이콘/액션 등 부가 요소 */
  trailing?: ReactNode;
}

/**
 * 공통 텍스트 인풋. type 은 text/password/email/number/date/time 모두 지원.
 * label / error / helper 노출, error 시 위험색 + aria-invalid.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helper, trailing, id, className, disabled, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error
    ? `${inputId}-error`
    : helper
      ? `${inputId}-helper`
      : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-bold text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-button border bg-surface px-3.5 text-[15px] leading-none text-foreground',
            'h-11 outline-none transition-colors placeholder:text-[#C0AE9B]',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:cursor-not-allowed disabled:bg-[#F7EFE5] disabled:text-[#A6907B]',
            error ? 'border-danger bg-[#FFF5F5] focus:ring-danger/20' : 'border-border',
            trailing ? 'pr-11' : null,
            className,
          )}
          {...rest}
        />
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A6907B]">
            {trailing}
          </span>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 flex items-center gap-1 text-[12px] text-danger">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      ) : helper ? (
        <p id={`${inputId}-helper`} className="mt-1.5 text-[12px] text-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
