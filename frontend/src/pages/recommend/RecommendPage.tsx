import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { getRecommendations } from '../../api/recommend';
import { getGroupPersona, type GroupPersona } from '../../api/survey';
import { searchPlaces, addBookmark, getBookmarks } from '../../api/place';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import { contentTypeLabel, type RecommendItem } from '../../types/recommend';
import { cn } from '../../lib/cn';
import { naverPlaceUrl } from '../../lib/naver';

/**
 * 맞춤 추천(TourAPI). thumbnailUrl 은 절대 URL → 그대로 사용.
 * "보관함 담기"는 전용 API 가 없어 추천 장소명으로 검색→보관함추가 플로우를 태운다(Google 단일 소스).
 */
/** 장소명 비교용 정규화(공백 제거 + 소문자). */
function normalizeName(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/** 그룹 평균 성향에서 가장 두드러진 축을 한 줄 수식어로(백엔드 추천 이유와 동일한 기준). */
function personaTrait(a: NonNullable<GroupPersona['average']>): string {
  const dA = Math.abs(a.activity - 0.5);
  const dF = Math.abs(a.food - 0.5);
  const dU = Math.abs(a.urbanNature - 0.5);
  if (dF >= dA && dF >= dU) return a.food >= 0.5 ? '먹거리를 즐기는' : '관광에 집중하는';
  if (dA >= dU) return a.activity >= 0.5 ? '활동적인' : '여유로운';
  return a.urbanNature >= 0.5 ? '도심을 즐기는' : '자연을 즐기는';
}

export default function RecommendPage({ groupId: groupIdProp }: { groupId?: number }) {
  const params = useParams<{ id: string }>();
  const groupId = groupIdProp ?? Number(params.id);
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 추천이 어떤 그룹 성향에 맞춘 것인지 보여주기 위해 그룹 평균 성향을 함께 불러온다.
  const { data: persona } = useQuery({
    queryKey: groupQueryKeys.persona(groupId),
    queryFn: () => getGroupPersona(groupId),
  });

  const { data: items = [], isLoading: loading, isError: error, refetch } = useQuery({
    queryKey: ['recommend', groupId],
    queryFn: () => getRecommendations(groupId),
  });
  const load = () => { void refetch(); };

  // 보관함과 비교해 '이미 담은 장소'를 표시한다(이름 기반 근사 매칭).
  const { data: bookmarks = [] } = useQuery({
    queryKey: groupQueryKeys.bookmarks(groupId),
    queryFn: () => getBookmarks(groupId),
  });
  const [saved, setSaved] = useState<Set<number>>(new Set());
  // 추천·보관함이 로드/갱신되면 이미 담긴 항목을 합집합으로 반영(수동 추가분은 유지).
  useEffect(() => {
    if (items.length === 0) return;
    const names = bookmarks.map((b) => normalizeName(b.place.name)).filter(Boolean);
    setSaved((prev) => {
      const next = new Set(prev);
      for (const r of items) {
        const t = normalizeName(r.title);
        if (t && names.some((n) => n === t || (t.length >= 3 && (n.includes(t) || t.includes(n))))) next.add(r.contentId);
      }
      return next;
    });
  }, [items, bookmarks]);

  // 추천 장소명으로 검색 → 첫 결과를 보관함에 추가(Google 단일 소스 규칙)
  const saveMutation = useMutation({
    mutationFn: async (item: RecommendItem) => {
      const { items: found } = await searchPlaces(groupId, item.title);
      if (found.length === 0) return { ok: false as const };
      await addBookmark(groupId, { googlePlaceId: found[0].googlePlaceId, categoryTag: found[0].category });
      return { ok: true as const, contentId: item.contentId };
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.warning('보관함에 담지 못했어요', '장소 검색 결과가 없어요. 직접 검색해 추가해 주세요.');
        return;
      }
      // 버튼이 '담음' 상태로 바뀌므로 확인 토스트는 생략.
      setSaved((prev) => new Set(prev).add(res.contentId));
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.bookmarks(groupId) });
    },
    onError: (e, item) => {
      // 이미 담긴 장소(409)면 에러 대신 '담음'으로 표시.
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) setSaved((prev) => new Set(prev).add(item.contentId));
      else toast.error('담기에 실패했어요', '잠시 후 다시 시도해 주세요.');
    },
  });
  const savingId = saveMutation.isPending ? saveMutation.variables.contentId : null;
  const onSave = (item: RecommendItem) => saveMutation.mutate(item);

  return (
    <AppLayout title="맞춤 추천" showBack>
      <div className="flex items-center gap-3 rounded-card bg-gradient-to-br from-[#FFEDF7] to-[#FFDDF0] px-4 py-3.5">
        <span className="text-[30px]">🧭</span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#AD5575]">그룹 성향 기반</p>
          <p className="text-[16px] font-extrabold text-[#7D3854]">성향순 추천 코스</p>
          {/* 어떤 성향에 맞춘 추천인지 표시(2/11) */}
          <p className="mt-0.5 text-[12px] font-semibold text-[#9A4869]">
            {persona?.average
              ? `${personaTrait(persona.average)} 그룹 성향에 맞췄어요${persona.matchRate != null ? ` · 일치율 ${persona.matchRate}%` : ''}`
              : '설문을 완료하면 그룹 성향 맞춤 추천을 받아요'}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[12px] font-bold text-muted">TourAPI · 성향 미응답 시 기본순</p>

      {/* 추천 → 계획 연결: 담은 장소를 그룹 보관함/일정에서 바로 이어서 짠다. */}
      <button
        type="button"
        onClick={() => navigate(`/groups/${groupId}?tab=place`)}
        className="mt-2.5 flex w-full items-center justify-between rounded-card border border-border bg-surface px-4 py-3 text-left active:scale-[.99]"
      >
        <span className="text-[13px] font-bold text-foreground">
          {saved.size > 0 ? `담은 장소 ${saved.size}곳으로 일정 짜기` : '보관함에서 일정 짜러 가기'}
        </span>
        <span className="text-[#C25478]">→</span>
      </button>

      <div className="mt-2.5 space-y-3">
        {loading && [0, 1, 2].map((i) => <SkeletonCard key={i} />)}

        {!loading && error && (
          <EmptyState title="추천을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요."
            action={<Button variant="secondary" onClick={load}>다시 시도</Button>} />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState title="추천 결과가 없어요" description="설문을 완료하면 더 정확한 추천을 받을 수 있어요." />
        )}

        {!loading && !error && items.map((item) => {
          const isSaved = saved.has(item.contentId);
          return (
            <div key={item.contentId} className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
              <a
                href={naverPlaceUrl(item.title, item.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block"
                title="네이버 지도에서 사진·리뷰 보기"
              >
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.title} loading="lazy" className="h-28 w-full object-cover" />
                ) : (
                  <div className="flex h-28 flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#F0A6BE] to-[#D9577F] text-white/90">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 21s-7-5.2-7-10.5A7 7 0 0 1 19 10.5C19 15.8 12 21 12 21Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                      <circle cx="12" cy="10.5" r="2" fill="currentColor" />
                    </svg>
                    <span className="text-[11px] font-bold">네이버 지도에서 사진 보기</span>
                  </div>
                )}
                <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-[#03C75A] px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
                  N 지도
                </span>
              </a>
              <div className="p-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">{item.title}</span>
                  <Badge tone="neutral">{item.categoryLabel ?? contentTypeLabel(item.contentTypeId)}</Badge>
                  {item.matchScore != null && <Badge tone="primary">{item.matchScore}%</Badge>}
                </div>
                <p className="mt-1 line-clamp-1 text-[12px] text-muted">{item.address}</p>
                {item.reason && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#FBF1FB] px-2.5 py-1.5 text-[12px] font-semibold leading-snug text-[#AD5575]">
                    <span aria-hidden>💡</span>
                    <span className="min-w-0 flex-1">{item.reason}</span>
                  </p>
                )}
                <Button size="sm" variant={isSaved ? 'ghost' : 'secondary'} loading={savingId === item.contentId}
                  className={cn('mt-3', isSaved && 'border border-border text-[#9A95A8]')} onClick={() => onSave(item)}>
                  {isSaved ? '보관함에 담음' : '+ 보관함에 담기'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
