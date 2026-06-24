import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  /** 직접 호출: show('success', '저장됨', '...') */
  show: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** 전역 토스트 훅. ToastProvider 하위에서만 사용. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 는 <ToastProvider> 안에서만 사용할 수 있습니다.');
  return ctx;
}

const STYLE: Record<ToastType, { accent: string; bg: string; mark: string }> = {
  success: { accent: 'border-l-success', bg: 'bg-success', mark: '✓' },
  error: { accent: 'border-l-danger', bg: 'bg-danger', mark: '!' },
  info: { accent: 'border-l-info', bg: 'bg-info', mark: 'i' },
  warning: { accent: 'border-l-warning', bg: 'bg-warning', mark: '!' },
};

const DURATION = 3200;

/** 앱 루트를 감싸 전역 토스트를 제공한다. */
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = ++seq.current;
      setToasts((list) => [...list, { id, type, title, message }]);
      window.setTimeout(() => remove(id), DURATION);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (t, m) => show('success', t, m),
      error: (t, m) => show('error', t, m),
      info: (t, m) => show('info', t, m),
      warning: (t, m) => show('warning', t, m),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[300px] max-w-[calc(100vw-2rem)] flex-col gap-2.5"
          role="region"
          aria-live="polite"
          aria-label="알림"
        >
          {toasts.map((t) => {
            const s = STYLE[t.type];
            return (
              <div
                key={t.id}
                className={cn(
                  'animate-toast-in pointer-events-auto flex gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-lg',
                  'border-l-4',
                  s.accent,
                )}
                role="status"
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-[22px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white',
                    s.bg,
                  )}
                >
                  {s.mark}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-foreground">{t.title}</p>
                  {t.message && <p className="mt-0.5 text-[12px] text-muted">{t.message}</p>}
                </div>
                <button
                  type="button"
                  aria-label="알림 닫기"
                  onClick={() => remove(t.id)}
                  className="ml-auto shrink-0 self-start text-[#C0AE9B] hover:text-muted"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
