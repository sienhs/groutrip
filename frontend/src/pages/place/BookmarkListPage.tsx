import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Select from '../../components/Select';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { ConfirmModal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { NaverThumb, StarRating, PriceTag } from './PlaceBits';
import BookmarkFormModal from './BookmarkFormModal';
import { getBookmarks, deleteBookmark } from '../../api/place';
import { cn } from '../../lib/cn';
import { naverPlaceUrl } from '../../lib/naver';
import {
  PLACE_CATEGORIES,
  CATEGORY_LABEL,
  BOOKMARK_SORTS,
  type BookmarkResponse,
  type BookmarkSort,
  type PlaceCategory,
} from '../../types/place';

type Status = 'loading' | 'done' | 'error';

/**
 * 그룹 보관함 화면 (그룹 허브 "장소/보관함" 탭).
 * 필터(카테고리) + 정렬(최근/평점/이름). 항목 수정/삭제는 작성자·Owner 권한(BE 검증).
 */
export default function BookmarkListPage({
  groupId: groupIdProp,
  planExists = false,
}: {
  groupId?: number;
  /** 그룹에 여행 계획(숙소 선정/예약)이 있으면 true → 계획 진입을 장소 추가에 합쳐 노출한다. */
  planExists?: boolean;
}) {
  const params = useParams<{ id: string }>();
  const groupId = groupIdProp ?? Number(params.id);
  const navigate = useNavigate();
  const toast = useToast();

  const [items, setItems] = useState<BookmarkResponse[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [sort, setSort] = useState<BookmarkSort>('RECENT');

  const [editing, setEditing] = useState<BookmarkResponse | null>(null);
  const [deleting, setDeleting] = useState<BookmarkResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getBookmarks(groupId, { category: category ?? undefined, sort });
      setItems(data);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, [groupId, category, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteBookmark(groupId, deleting.id);
      toast.success('삭제했어요', deleting.place.name);
      setItems((prev) => prev.filter((b) => b.id !== deleting.id));
      setDeleting(null);
    } catch {
      toast.error('삭제에 실패했어요', '권한이 없거나 일시적 오류일 수 있어요.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* 장소 추가하기 — 여행 계획 플로우(숙소/맛집/명소 선정)로 진입. 계획이 있으면 '이어가기'로 합쳐 노출. */}
      <button
        type="button"
        onClick={() => navigate(`/groups/${groupId}/plan`)}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#FFCBA6] bg-[#FFF7F0] py-3 text-[14px] font-bold text-[#E8742E] active:bg-[#FFEEDF]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {planExists ? '여행 계획 이어가기 · 장소 추가' : '장소 추가하기'}
      </button>

      {/* 필터 + 정렬 */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip active={category === null} onClick={() => setCategory(null)}>전체</FilterChip>
        {PLACE_CATEGORIES.map((c) => (
          <FilterChip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
            {c.label}
          </FilterChip>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[13px] text-muted">
          {status === 'done' ? `${items.length}개 장소` : '보관함'}
        </span>
        <div className="w-36">
          <Select
            aria-label="정렬"
            value={sort}
            onChange={(e) => setSort(e.target.value as BookmarkSort)}
            options={BOOKMARK_SORTS.map((s) => ({ value: s.value, label: s.label }))}
          />
        </div>
      </div>

      {/* 목록 */}
      <div className="mt-4 space-y-3">
        {status === 'loading' && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}

        {status === 'error' && (
          <EmptyState
            title="보관함을 불러오지 못했어요"
            description="네트워크 상태를 확인하고 다시 시도해 주세요."
            action={<Button variant="secondary" onClick={load}>다시 시도</Button>}
          />
        )}

        {status === 'done' && items.length === 0 && (
          <EmptyState
            title={category ? '이 카테고리에 저장된 장소가 없어요' : '보관함이 비어 있어요'}
            description="장소를 검색해 마음에 드는 곳을 모아보세요."
          />
        )}

        {status === 'done' &&
          items.map((b) => (
            <BookmarkCard
              key={b.id}
              bookmark={b}
              onEdit={() => setEditing(b)}
              onDelete={() => setDeleting(b)}
            />
          ))}
      </div>

      {editing && (
        <BookmarkFormModal
          open
          mode="edit"
          bookmark={editing}
          groupId={groupId}
          onClose={() => setEditing(null)}
          onSaved={(saved) =>
            setItems((prev) => prev.map((b) => (b.id === saved.id ? saved : b)))
          }
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        danger
        title="보관함에서 삭제할까요?"
        description={deleting ? `'${deleting.place.name}'을(를) 보관함에서 제거합니다.` : undefined}
        confirmText="삭제"
      />
    </div>
  );
}

function FilterChip({
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
        'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-surface text-[#7A6A58] hover:border-[#FFCBA6]',
      )}
    >
      {children}
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
}: {
  bookmark: BookmarkResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { place } = bookmark;
  return (
    <div className="rounded-card border border-border bg-surface p-3 shadow-sm">
      <div className="flex gap-3">
        <NaverThumb
          photoUrl={place.photoUrl}
          category={bookmark.categoryTag}
          name={place.name}
          naverHref={naverPlaceUrl(place.name, place.address)}
          className="size-[84px] rounded-[10px]"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-[#3A322B]">
              {place.name}
            </h3>
            <Badge tone="primary">{CATEGORY_LABEL[bookmark.categoryTag]}</Badge>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <StarRating value={place.rating} count={place.ratingCount} />
            <PriceTag priceLevel={place.priceLevel} />
          </div>

          {place.address && <p className="mt-1 line-clamp-1 text-[12px] text-muted">{place.address}</p>}

          {bookmark.personalRating != null && (
            <div className="mt-1.5 flex items-center gap-1 text-[12px] font-bold text-[#5C5044]">
              <span className="text-[#A6907B]">내 평점</span>
              {'★'.repeat(bookmark.personalRating)}
              <span className="text-[#E0D2C2]">{'★'.repeat(5 - bookmark.personalRating)}</span>
            </div>
          )}
        </div>
      </div>

      {bookmark.memo && (
        <p className="mt-2.5 rounded-button bg-background px-3 py-2 text-[13px] leading-relaxed text-[#5C5044]">
          {bookmark.memo}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
        <span className="text-[12px] text-muted">
          {bookmark.createdByName} · {formatDate(bookmark.createdAt)}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="수정"
            onClick={onEdit}
            className="flex size-8 items-center justify-center rounded-button text-[#8A7B6B] hover:bg-black/5"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L4 18v2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="m13.5 7 3 3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="삭제"
            onClick={onDelete}
            className="flex size-8 items-center justify-center rounded-button text-[#8A7B6B] hover:bg-[#FEE2E2] hover:text-danger"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
