import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { PlacePhoto, StarRating, PriceTag } from './PlaceBits';
import BookmarkFormModal from './BookmarkFormModal';
import { searchPlaces } from '../../api/place';
import { cn } from '../../lib/cn';
import { naverPlaceUrl } from '../../lib/naver';
import {
  PLACE_CATEGORIES,
  CATEGORY_LABEL,
  type PlaceCategory,
  type PlaceSearchResult,
} from '../../types/place';

type Status = 'idle' | 'loading' | 'done' | 'error';

/**
 * 장소 검색 화면 (그룹 허브 "장소" 탭).
 * 데이터 페칭은 axios + 로컬 상태(추가 필요 패키지 React Query 도입 시 useQuery/useMutation 로 이관).
 * groupId 는 prop 우선, 없으면 라우트 파라미터(:id).
 */
export default function PlaceSearchPage({ groupId: groupIdProp }: { groupId?: number }) {
  const params = useParams<{ id: string }>();
  const groupId = groupIdProp ?? Number(params.id);
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PlaceCategory | null>(null); // null = 전체
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<PlaceSearchResult | null>(null);

  const runSearch = async (q: string, cat: PlaceCategory | null) => {
    if (!q.trim()) return; // 공백만이면 BE 400 → 호출 안 함
    setStatus('loading');
    try {
      const { items, nextPageToken } = await searchPlaces(groupId, q.trim(), cat ?? undefined);
      setResults(items);
      setNextToken(nextPageToken);
      setStatus('done');
    } catch {
      setStatus('error');
      toast.error('검색에 실패했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  // 무한 스크롤: pageToken 으로 다음 15개 이어붙임
  const loadMore = async () => {
    if (!nextToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const { items, nextPageToken } = await searchPlaces(groupId, query.trim(), category ?? undefined, nextToken);
      setResults((prev) => [...prev, ...items]);
      setNextToken(nextPageToken);
    } catch {
      toast.error('더 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setLoadingMore(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    runSearch(query, category);
  };

  // 카테고리 변경 시, 이미 검색한 적이 있으면 같은 키워드로 재검색
  const onPickCategory = (cat: PlaceCategory | null) => {
    setCategory(cat);
    if (status !== 'idle' && query.trim()) runSearch(query, cat);
  };

  return (
    <div className="flex flex-col">
      {/* 검색 입력 */}
      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <svg
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C0AE9B]"
            width="18" height="18" viewBox="0 0 24 24" fill="none"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장소·키워드 검색 (예: 제주 흑돼지)"
            enterKeyHint="search"
            className="h-11 w-full rounded-button border border-border bg-surface pl-10 pr-3 text-[15px] outline-none transition-colors placeholder:text-[#C0AE9B] focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Button type="submit" disabled={!query.trim()}>
          검색
        </Button>
      </form>

      {/* 카테고리 칩 (전체 + 5종) */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <CategoryChip active={category === null} onClick={() => onPickCategory(null)}>
          전체
        </CategoryChip>
        {PLACE_CATEGORIES.map((c) => (
          <CategoryChip key={c.value} active={category === c.value} onClick={() => onPickCategory(c.value)}>
            {c.label}
          </CategoryChip>
        ))}
      </div>

      {/* 결과 영역 */}
      <div className="mt-4 space-y-3">
        {status === 'loading' &&
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}

        {status === 'done' && results.length === 0 && (
          <EmptyState
            title="검색 결과가 없어요"
            description="다른 키워드로 다시 검색해 보세요."
          />
        )}

        {status === 'error' && (
          <EmptyState
            title="검색을 불러오지 못했어요"
            description="네트워크 상태를 확인하고 다시 시도해 주세요."
            action={<Button variant="secondary" onClick={() => runSearch(query, category)}>다시 시도</Button>}
          />
        )}

        {status === 'idle' && (
          <EmptyState
            title="가고 싶은 곳을 검색해 보세요"
            description="검색한 장소를 그룹 보관함에 모아둘 수 있어요."
          />
        )}

        {status === 'done' &&
          results.map((p) => (
            <ResultCard
              key={p.googlePlaceId}
              place={p}
              added={addedIds.has(p.googlePlaceId)}
              onAdd={() => setTarget(p)}
            />
          ))}

        {status === 'done' && nextToken && (
          <Button variant="ghost" fullWidth className="border border-border" loading={loadingMore} onClick={loadMore}>
            더 보기
          </Button>
        )}
      </div>

      {target && (
        <BookmarkFormModal
          open
          mode="create"
          place={target}
          groupId={groupId}
          onClose={() => setTarget(null)}
          onSaved={(saved) =>
            setAddedIds((prev) => new Set(prev).add(saved.place.googlePlaceId))
          }
        />
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-bold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-surface text-[#7A6A58] hover:border-[#FFCBA6] hover:text-[#E8742E]',
      )}
    >
      {children}
    </button>
  );
}

function ResultCard({
  place,
  added,
  onAdd,
}: {
  place: PlaceSearchResult;
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex gap-3 rounded-card border border-border bg-surface p-3 shadow-sm">
      <PlacePhoto
        photoUrl={place.photoUrl}
        category={place.category}
        name={place.name}
        naverHref={naverPlaceUrl(place.name, place.address)}
        className="size-[84px] shrink-0 rounded-[10px]"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-[#3A322B]">
            {place.name}
          </h3>
          <Badge tone="neutral">{CATEGORY_LABEL[place.category]}</Badge>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <StarRating value={place.rating} count={place.ratingCount} />
          <PriceTag priceLevel={place.priceLevel} />
        </div>

        {place.address && (
          <p className="mt-1 line-clamp-1 text-[12px] text-muted">{place.address}</p>
        )}

        <div className="mt-auto pt-2">
          <Button
            size="sm"
            variant={added ? 'ghost' : 'secondary'}
            onClick={onAdd}
            className={cn(added && 'border border-border text-[#A6907B]')}
          >
            {added ? '보관함에 있음 · 다시 추가' : '+ 보관함에 추가'}
          </Button>
        </div>
      </div>
    </div>
  );
}
