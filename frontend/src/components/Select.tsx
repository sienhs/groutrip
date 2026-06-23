import { forwardRef, useId, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: ReactNode;
  error?: ReactNode;
  helper?: ReactNode;
  options: SelectOption[];
  placeholder?: string;
}

/** 공통 셀렉트. options 배열로 렌더, label/error/helper 지원, 커스텀 화살표. */
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, helper, options, placeholder, id, className, disabled, value, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy = error
    ? `${selectId}-error`
    : helper
      ? `${selectId}-helper`
      : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-[13px] font-bold text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-11 w-full appearance-none rounded-button border bg-surface pl-3.5 pr-10 text-[15px] text-foreground',
            'outline-none transition-colors',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:cursor-not-allowed disabled:bg-[#F7EFE5] disabled:text-[#A6907B]',
            error ? 'border-danger bg-[#FFF5F5]' : 'border-border',
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A6907B]"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {error ? (
        <p id={`${selectId}-error`} className="mt-1.5 text-[12px] text-danger">{error}</p>
      ) : helper ? (
        <p id={`${selectId}-helper`} className="mt-1.5 text-[12px] text-muted">{helper}</p>
      ) : null}
    </div>
  );
});

export default Select;
