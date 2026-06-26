import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/** 약관·정책 등 공개 문서 공용 레이아웃(인증 불필요). 상단 뒤로가기 + 읽기 좋은 본문 폭. */
export default function LegalLayout({ title, effectiveDate, children }: {
  title: string;
  effectiveDate?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-surface px-4">
        <button
          type="button"
          aria-label="뒤로가기"
          onClick={() => navigate(-1)}
          className="-ml-1.5 flex size-9 items-center justify-center rounded-button text-foreground hover:bg-black/5"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="truncate text-[16px] font-extrabold tracking-tight text-foreground">{title}</h1>
      </header>

      <main className="px-5 py-6">
        <p className="text-[19px] font-extrabold tracking-tight text-foreground">{title}</p>
        {effectiveDate && <p className="mt-1 text-[12px] text-muted">시행일: {effectiveDate}</p>}
        <div className="mt-5 space-y-6 text-[13.5px] leading-relaxed text-muted">{children}</div>
      </main>
    </div>
  );
}

/** 정책 본문의 한 절(제목 + 내용). */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[15px] font-extrabold text-foreground">{heading}</h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}
