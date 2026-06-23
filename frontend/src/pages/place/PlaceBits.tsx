import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { placePhotoSrc } from '../../api/place';
import { PRICE_LEVEL_LABEL, type PlaceCategory, type PriceLevel } from '../../types/place';

/* ── 카테고리 아이콘 (사진 없을 때 플레이스홀더용, 단순 라인 아이콘) ── */
const CAT_ICON: Record<PlaceCategory, ReactNode> = {
  LODGING: (
    <path d="M4 19v-9l8-4 8 4v9M9 19v-5h6v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  RESTAURANT: (
    <path d="M7 3v8m0 0a2 2 0 0 0 2-2V3M7 11v10M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4m0 0v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  CAFE: (
    <path d="M5 9h11v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9ZM16 10h2.5a2 2 0 0 1 0 4H16M7 5c0-1 .8-1.5.8-2.5M11 5c0-1 .8-1.5.8-2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  TOURIST_ATTRACTION: (
    <path d="M5 21V8l7-5 7 5v13M5 21h14M10 21v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  SHOPPING: (
    <path d="M6 8h12l-1 12H7L6 8ZM9 8a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  ETC: (
    <path d="M12 21s-7-5.2-7-10.5A7 7 0 0 1 19 10.5C19 15.8 12 21 12 21Z M12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

interface PlacePhotoProps {
  photoUrl: string | null;
  category: PlaceCategory;
  name: string;
  className?: string;
  /** 있으면 사진/플레이스홀더를 누를 때 네이버 지도(리뷰·사진)로 이동한다. */
  naverHref?: string;
}

/** 좌하단 네이버 지도 배지(초록 N). */
function NaverBadge() {
  return (
    <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-[5px] bg-[#03C75A] text-[10px] font-black leading-none text-white shadow">
      N
    </span>
  );
}

/**
 * 장소 썸네일. photoUrl 있으면 프록시 이미지, 없거나 로드 실패 시 카테고리 아이콘 플레이스홀더.
 * naverHref가 있으면 클릭 시 네이버 지도로 이동(사진 없는 곳도 들어가서 상세 사진/리뷰 확인).
 */
export function PlacePhoto({ photoUrl, category, name, className, naverHref }: PlacePhotoProps) {
  const [failed, setFailed] = useState(false);
  const src = placePhotoSrc(photoUrl);
  const hasPhoto = !!src && !failed;

  const inner = hasPhoto ? (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', !naverHref && 'object-cover', className && !naverHref ? className : undefined)}
    />
  ) : (
    <div className={cn('flex h-full w-full flex-col items-center justify-center gap-0.5 bg-[#FFF1E6] text-[#FFB585]', className && !naverHref ? className : undefined)}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        {CAT_ICON[category]}
      </svg>
      {naverHref && <span className="text-[9px] font-bold text-[#03C75A]">사진 보기</span>}
    </div>
  );

  if (!naverHref) {
    // 기존 동작(단순 표시)
    return hasPhoto ? (
      <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className={cn('object-cover', className)} />
    ) : (
      <div className={cn('flex items-center justify-center bg-[#FFF1E6] text-[#FFB585]', className)}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>{CAT_ICON[category]}</svg>
      </div>
    );
  }

  return (
    <a
      href={naverHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={`${name} 네이버 지도에서 보기`}
      className={cn('relative block shrink-0 overflow-hidden', className)}
      title="네이버 지도에서 사진·리뷰 보기"
    >
      {inner}
      <NaverBadge />
    </a>
  );
}

interface StarRatingProps {
  /** Google 평점(0~5, 소수). */
  value: number | null;
  count?: number | null;
  className?: string;
}

/** 읽기 전용 평점 표시: 별 + 점수 + (리뷰 수). 평점 없으면 "평점 없음". */
export function StarRating({ value, count, className }: StarRatingProps) {
  if (value == null) {
    return <span className={cn('text-[12px] text-[#C0AE9B]', className)}>평점 없음</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12px] font-bold text-[#5C5044]', className)}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#F2B85A" aria-hidden>
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
      </svg>
      {value.toFixed(1)}
      {count != null && <span className="font-medium text-[#A6907B]">({count.toLocaleString()})</span>}
    </span>
  );
}

/** 가격대 배지(₩ 개수). 없으면 렌더 안 함. */
export function PriceTag({ priceLevel, className }: { priceLevel: PriceLevel | null; className?: string }) {
  if (!priceLevel) return null;
  return (
    <span className={cn('text-[12px] font-bold text-[#7FAE6B]', className)}>
      {PRICE_LEVEL_LABEL[priceLevel]}
    </span>
  );
}

interface StarInputProps {
  value: number; // 0 = 미평가
  onChange: (next: number) => void;
}

/** 개인 평점 입력(1~5 별, 클릭 토글). 같은 별 다시 누르면 해제. */
export function StarInput({ value, onChange }: StarInputProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="개인 평점">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}점`}
            onClick={() => onChange(value === n ? 0 : n)}
            className="p-0.5 text-[#E7D7C5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill={on ? '#F2B85A' : 'currentColor'} aria-hidden>
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
            </svg>
          </button>
        );
      })}
      {value > 0 && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="ml-1 text-[12px] font-medium text-[#A6907B] hover:text-[#5C5044]"
        >
          지우기
        </button>
      )}
    </div>
  );
}
