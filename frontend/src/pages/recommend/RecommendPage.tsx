import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { getRecommendations } from '../../api/recommend';
import { getGroupPersona, type GroupPersona } from '../../api/survey';
import { searchPlaces, addBookmark } from '../../api/place';
import { contentTypeLabel, type RecommendItem } from '../../types/recommend';
import { cn } from '../../lib/cn';
import { naverPlaceUrl } from '../../lib/naver';

/**
 * 맞춤 추천(TourAPI). thumbnailUrl 은 절대 URL → 그대로 사용.
 * "보관함 담기"는 전용 API 가 없어 추천 장소명으로 검색→보관함추가 플로우를 태운다(Google 단일 소스).
 */
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

  const [items, setItems] = useState<RecommendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [persona, setPersona] = useState<GroupPersona | null>(null);

  // 추천이 어떤 그룹 성향에 맞춘 것인지 보여주기 위해 그룹 평균 성향을 함께 불러온다.
  useEffect(() => {
    let active = true;
    getGroupPersona(groupId).then((p) => active && setPersona(p)).catch(() => {});
    return () => { active = false; };
  }, [groupId]);

  // 재시도 버튼용(이벤트 핸들러).
  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getRecommendations(groupId)
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [groupId]);

  // 진입/그룹 변경 시 로드. effect 본문 동기 setState를 피해 async 콜백에서만 상태를 바꾼다.
  useEffect(() => {
    let active = true;
    getRecommendations(groupId)
      .then((d) => { if (active) { setItems(d); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId]);

  // 추천 장소명으로 검색 → 첫 결과를 보관함에 추가(Google 단일 소스 규칙)
  const onSave = async (item: RecommendItem) => {
    setSavingId(item.contentId);
    try {
      const { items: found } = await searchPlaces(groupId, item.title);
      if (found.length === 0) {
        toast.warning('보관함에 담지 못했어요', '장소 검색 결과가 없어요. 직접 검색해 추가해 주세요.');
        return;
      }
      await addBookmark(groupId, { googlePlaceId: found[0].googlePlaceId, categoryTag: found[0].category });
      setSaved((prev) => new Set(prev).add(item.contentId));
      toast.success('보관함에 담았어요', found[0].name);
    } catch {
      toast.error('담기에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AppLayout title="맞춤 추천" showBack>
      <div className="flex items-center gap-3 rounded-card bg-gradient-to-br from-[#FFEAD9] to-[#FFD9BF] px-4 py-3.5">
        <span className="text-[30px]">🧭</span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#B5763E]">그룹 성향 기반</p>
          <p className="text-[16px] font-extrabold text-[#8A4B1E]">성향순 추천 코스</p>
          {/* 어떤 성향에 맞춘 추천인지 표시(2/11) */}
          <p className="mt-0.5 text-[12px] font-semibold text-[#A8662F]">
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
        <span className="text-[#E8742E]">→</span>
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
                  <div className="flex h-28 flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#FFB088] to-[#FF8A47] text-white/90">
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
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#FFF3E9] px-2.5 py-1.5 text-[12px] font-semibold leading-snug text-[#B5763E]">
                    <span aria-hidden>💡</span>
                    <span className="min-w-0 flex-1">{item.reason}</span>
                  </p>
                )}
                <Button size="sm" variant={isSaved ? 'ghost' : 'secondary'} loading={savingId === item.contentId}
                  className={cn('mt-3', isSaved && 'border border-border text-[#A6907B]')} onClick={() => onSave(item)}>
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
