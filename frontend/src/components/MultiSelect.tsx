import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  options: MultiSelectOption[];
  /** 선택된 value 배열 (controlled) */
  value: string[];
  onChange: (next: string[]) => void;
  /** 최대 선택 개수 (초과 시 더 이상 선택 불가) */
  max?: number;
}

/**
 * 칩(토글 버튼) 기반 다중 선택. controlled.
 * 관심 태그 / 카테고리 필터 등에 사용.
 */
export default function MultiSelect({
  label,
  helper,
  error,
  options,
  value,
  onChange,
  max,
}: MultiSelectProps) {
  const groupId = useId();

  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, v]);
    }
  };

  return (
    <div className="w-full" role="group" aria-labelledby={label ? `${groupId}-label` : undefined}>
      {label && (
        <div id={`${groupId}-label`} className="mb-2.5 text-[13px] font-bold text-foreground">
          {label}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          const reachedMax = !!max && value.length >= max && !selected;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              disabled={reachedMax}
              onClick={() => toggle(opt.value)}
              className={cn(
                'rounded-full border px-3.5 py-2 text-[13px] font-bold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface text-muted hover:border-[#FFCFEB] hover:text-[#C25478]',
                reachedMax && 'cursor-not-allowed opacity-40',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-2 text-[12px] text-danger">{error}</p>
      ) : helper ? (
        <p className="mt-2 text-[12px] text-muted">{helper}</p>
      ) : null}
    </div>
  );
}
