import { useState } from 'react';
import { getReviewSummary } from '../../api/place';
import { cn } from '../../lib/cn';
import type { ReviewSummary } from '../../types/place';

/**
 * 'AI 리뷰' 버튼 — 클릭 시점에만 구글 리뷰를 AI로 요약해(토큰 절약) 같은 자리에
 * 떠 있는 패널로 보여준다(별도 탭 이동 없음). 한 번 불러온 결과는 컴포넌트 내에서 재사용한다.
 */
export default function AiReviewButton({
  groupId,
  googlePlaceId,
  size = 'sm',
  className,
  align = 'right',
}: {
  groupId: number;
  googlePlaceId: string;
  size?: 'sm' | 'xs';
  className?: string;
  /** 패널 정렬(부모 카드 가장자리 기준). */
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReviewSummary | null>(null);
  const [error, setError] = useState(false);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (data || loading) return; // 이미 불러옴/불러오는 중이면 재호출 안 함
    setLoading(true);
    setError(false);
    try {
      setData(await getReviewSummary(groupId, googlePlaceId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          void toggle();
        }}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-[#E7D7C5] bg-[#FFF7F0] font-bold text-[#E8742E] transition-colors hover:bg-[#FFEFE0]',
          size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[12px]',
        )}
      >
        <Sparkle small={size === 'xs'} />
        AI 리뷰
      </button>

      {open && (
        <>
          {/* 바깥 클릭 시 닫기 */}
          <button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-40 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'absolute top-full z-50 mt-1.5 w-64 rounded-card border border-border bg-surface p-3 text-left shadow-lg',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <Sparkle />
              <span className="text-[12px] font-extrabold text-[#E8742E]">AI 리뷰 요약</span>
              {data?.rating != null && (
                <span className="ml-auto text-[11px] font-bold text-muted">
                  ★ {data.rating.toFixed(1)}
                  {data.ratingCount != null && ` · ${data.ratingCount.toLocaleString()}개`}
                </span>
              )}
            </div>

            {loading && (
              <div className="space-y-1.5 py-1">
                <div className="h-3 w-full animate-pulse rounded bg-skeleton" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-skeleton" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-skeleton" />
                <p className="pt-1 text-[11px] text-muted">구글 리뷰를 요약하는 중…</p>
              </div>
            )}

            {!loading && error && (
              <p className="py-1 text-[12px] text-muted">요약을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
            )}

            {!loading && !error && data && (() => {
              // 백엔드 응답 형태가 달라도(구버전 등) 죽지 않도록 방어적으로 정규화.
              const pros = Array.isArray(data.pros) ? data.pros : [];
              const cons = Array.isArray(data.cons) ? data.cons : [];
              const overall = data.overall ?? null;
              return data.available && (overall || pros.length > 0 || cons.length > 0) ? (
                <div className="space-y-2">
                  {overall && (
                    <p className="rounded-lg bg-[#FFF7F0] px-2.5 py-2 text-[12.5px] font-semibold leading-relaxed text-[#8A4B1E]">
                      {overall}
                    </p>
                  )}
                  {pros.length > 0 && (
                    <ul className="space-y-1">
                      {pros.map((p, i) => (
                        <li key={`p${i}`} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-foreground">
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                          <span className="min-w-0 flex-1">{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {cons.length > 0 && (
                    <ul className="space-y-1">
                      {cons.map((c, i) => (
                        <li key={`c${i}`} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 12h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                          </span>
                          <span className="min-w-0 flex-1">{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="py-1 text-[12px] text-muted">{data.message ?? '요약할 리뷰가 충분하지 않아요.'}</p>
              );
            })()}

            <p className="mt-2 border-t border-border pt-1.5 text-[10px] text-[#BCA48C]">구글 리뷰 기반 AI 요약 · 참고용</p>
          </div>
        </>
      )}
    </div>
  );
}

function Sparkle({ small }: { small?: boolean }) {
  const s = small ? 11 : 13;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" fill="currentColor" />
      <path d="M19 14l.7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7L19 14Z" fill="currentColor" />
    </svg>
  );
}
