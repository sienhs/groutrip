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
}

/** 장소 썸네일. photoUrl 있으면 프록시 이미지, 없거나 로드 실패 시 카테고리 아이콘 플레이스홀더. */
export function PlacePhoto({ photoUrl, category, name, className }: PlacePhotoProps) {
  const [failed, setFailed] = useState(false);
  const src = placePhotoSrc(photoUrl);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn('object-cover', className)}
      />
    );
  }
  return (
    <div className={cn('flex items-center justify-center bg-[#FCF0F9] text-[#FFB0DD]', className)}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        {CAT_ICON[category]}
      </svg>
    </div>
  );
}

/**
 * 썸네일 + 그 아래 '네이버 지도' 버튼. 사진은 박스에 작게 보여주고,
 * 네이버 지도(사진·리뷰)는 별도 버튼으로 분리한다(사진 없는 곳도 외부에서 확인).
 */
export function NaverThumb({
  photoUrl,
  category,
  name,
  naverHref,
  className,
}: PlacePhotoProps & { naverHref: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <PlacePhoto photoUrl={photoUrl} category={category} name={name} className={className} />
      <a
        href={naverHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="네이버 지도에서 사진·리뷰 보기"
        className="flex items-center gap-1 rounded-button px-1.5 py-0.5 text-[10px] font-bold text-[#03C75A] transition-colors hover:bg-[#E9F8EE]"
      >
        <span className="flex size-3 items-center justify-center rounded-[3px] bg-[#03C75A] text-[8px] font-black leading-none text-white">N</span>
        지도
      </a>
    </div>
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
    return <span className={cn('text-[12px] text-[#B6B1C4]', className)}>평점 없음</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12px] font-bold text-muted', className)}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFC93C" aria-hidden>
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
      </svg>
      {value.toFixed(1)}
      {count != null && <span className="font-medium text-[#9A95A8]">({count.toLocaleString()})</span>}
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

