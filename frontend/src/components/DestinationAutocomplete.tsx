import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { searchRegions, type Region } from '../lib/regions';

interface Props {
  /** 선택된 정규 목적지(추천 매칭 가능 값). 미선택 시 ''. */
  value: string;
  /** 지역을 선택/해제할 때 정규 목적지로 호출. 미선택은 ''. */
  onChange: (value: string) => void;
  label?: ReactNode;
  placeholder?: string;
  error?: ReactNode;
  helper?: ReactNode;
}

/**
 * 그룹 목적지 자동완성 콤보박스.
 *
 * 사용자가 지역 키워드를 입력하면 후보를 드롭다운으로 보여주고, 선택하면
 * 추천 매칭이 보장되는 정규 목적지(예: "경기도 용인시")로 확정한다.
 * 텍스트를 다시 수정하면 선택이 해제(value='')돼 반드시 목록에서 고르게 한다.
 */
export default function DestinationAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  error,
  helper,
}: Props) {
  const autoId = useId();
  const listId = `${autoId}-list`;
  const wrapRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = open ? searchRegions(query) : [];
  // 목록에 없는 임의 지명도 그대로 목적지로 쓸 수 있게 "직접 입력" 옵션을 제공한다.
  // (백엔드 추천이 지오코딩으로 임의 지명의 소속 시/도를 해석한다.)
  const trimmed = query.trim();
  const showFreeText = open && trimmed.length > 0 && !results.some((r) => r.value === trimmed);
  const optionCount = results.length + (showFreeText ? 1 : 0);

  // 외부에서 새 value 가 들어오면(편집 진입/리셋) 입력 텍스트를 렌더 중 동기화한다.
  // (React 권장 "이전 prop 저장" 패턴 — 같은 컴포넌트 렌더 중 setState 는 허용된다.)
  // 선택 시에는 직접 setQuery 로 맞추므로(value===query) 건드리지 않고,
  // 텍스트 수정으로 value 가 ''가 되는 경우(value 빈값)도 타이핑을 보존한다.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value && value !== query) setQuery(value);
  }

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const select = (region: Region) => {
    onChange(region.value);
    setQuery(region.value);
    setOpen(false);
  };

  // 입력한 텍스트를 그대로 목적지로 확정(목록에 없는 지명용).
  const commitFreeText = () => {
    if (!trimmed) return;
    onChange(trimmed);
    setQuery(trimmed);
    setOpen(false);
  };

  const handleChange = (text: string) => {
    setQuery(text);
    setActive(0);
    setOpen(true);
    if (value) onChange(''); // 텍스트를 고치면 이전 선택을 무효화
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, optionCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && active < results.length && results[active]) {
        e.preventDefault();
        select(results[active]);
      } else if (open && showFreeText && active === results.length) {
        e.preventDefault();
        commitFreeText();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const inputId = autoId;
  const describedBy = error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined;

  return (
    <div className="w-full" ref={wrapRef}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-bold text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full rounded-button border bg-surface px-3.5 pr-10 text-[15px] leading-none text-foreground',
            'h-11 outline-none transition-colors placeholder:text-[#B6B1C4]',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            error ? 'border-danger bg-[#FFF1FA] focus:ring-danger/20' : 'border-border',
          )}
        />
        {/* 선택 완료 표시(체크) / 검색 아이콘 */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9A95A8]">
          {value ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 13l4 4L19 7" stroke="#E86A92" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </span>

        {open && optionCount > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-auto rounded-card border border-border bg-surface py-1 shadow-lg"
          >
            {results.map((r, i) => (
              <li
                key={r.value}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // input blur 방지
                  select(r);
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-[14px]',
                  i === active ? 'bg-[#FCF0F9] text-[#2C2833]' : 'text-[#4A4654]',
                )}
              >
                <span className="font-semibold">{r.label}</span>
                <span className="text-[12px] text-[#9A95A8]">{r.value}</span>
              </li>
            ))}
            {showFreeText && (
              <li
                role="option"
                aria-selected={active === results.length}
                onMouseEnter={() => setActive(results.length)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commitFreeText();
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3.5 py-2.5 text-[14px]',
                  results.length > 0 && 'border-t border-border',
                  active === results.length ? 'bg-[#FCF0F9] text-[#2C2833]' : 'text-[#4A4654]',
                )}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[#9A95A8]">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <span className="font-semibold">‘{trimmed}’ 직접 사용</span>
              </li>
            )}
          </ul>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-[12px] text-danger">{error}</p>
      ) : helper ? (
        <p id={`${inputId}-helper`} className="mt-1.5 text-[12px] text-muted">{helper}</p>
      ) : null}
    </div>
  );
}
