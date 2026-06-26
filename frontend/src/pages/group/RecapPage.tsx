import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { getGroup, getGroupMembers } from '../../api/group';
import { getBookmarks } from '../../api/place';
import { getGroupPhotos, fetchPhotoObjectUrl, type GroupPhoto } from '../../api/gallery';
import { getExpenses } from '../../api/expense';
import { placePhotoSrc } from '../../api/place';
import { dateRange, gradientForKey } from './groupUi';
import { cn } from '../../lib/cn';
import type { TravelGroup } from '../../types/group';
import type { BookmarkResponse } from '../../types/place';

interface RecapData {
  group: TravelGroup;
  memberCount: number;
  bookmarks: BookmarkResponse[];
  photos: GroupPhoto[];
  totalSpending: number;
}

/**
 * 여행 리캡 — 완료된 여행의 추억 요약(기간/멤버/방문 장소/사진/지출).
 * 홈의 완료 카드 "회고 보기"에서 진입. 기존 그룹 API를 모아 보여준다.
 */
export default function RecapPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();

  // 리캡은 여러 그룹 API를 모아 한 화면에 보여주므로 복합 queryFn 하나로 묶는다.
  const { data, isLoading: loading, isError: error } = useQuery({
    queryKey: ['recap', groupId],
    queryFn: async (): Promise<RecapData> => {
      const [group, members, bookmarks, photos, expenses] = await Promise.all([
        getGroup(groupId),
        getGroupMembers(groupId),
        getBookmarks(groupId).catch(() => []),
        getGroupPhotos(groupId).catch(() => []),
        getExpenses(groupId).catch(() => []),
      ]);
      return {
        group,
        memberCount: members.length,
        bookmarks,
        photos,
        totalSpending: expenses.reduce((sum, e) => sum + e.amount, 0),
      };
    },
  });

  const share = async () => {
    if (!data) return;
    const g = data.group;
    const text =
      `✈️ ${g.title} 여행 리캡\n` +
      `📍 ${g.destination} · ${dateRange(g.startDate, g.endDate)}\n` +
      `👥 멤버 ${data.memberCount}명 · 📌 장소 ${data.bookmarks.length}곳 · 📷 사진 ${data.photos.length}장\n` +
      `💸 총 지출 ${data.totalSpending.toLocaleString('ko-KR')}원`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('리캡을 복사했어요', '친구에게 공유해 보세요!');
    } catch {
      toast.info('리캡', text);
    }
  };

  return (
    <AppLayout title="여행 리캡" showBack>
      {loading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : error || !data ? (
        <div className="mt-10">
          <EmptyState title="리캡을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요."
            action={<Button variant="secondary" onClick={() => navigate(-1)}>돌아가기</Button>} />
        </div>
      ) : (
        <div className="space-y-5">
          {/* 헤더 */}
          <div className={cn('relative overflow-hidden rounded-card p-5 text-white', gradientForKey(data.group.coverImageKey))}>
            <div className="text-[12px] font-bold opacity-90">{dateRange(data.group.startDate, data.group.endDate)}</div>
            <div className="mt-1 text-[22px] font-extrabold tracking-tight drop-shadow">{data.group.title}</div>
            <div className="mt-0.5 text-[13px] opacity-90">{data.group.destination}</div>
          </div>

          {/* 숫자 요약 */}
          <div className="grid grid-cols-4 gap-2">
            <RecapStat value={`${data.memberCount}`} label="멤버" />
            <RecapStat value={`${data.bookmarks.length}`} label="장소" />
            <RecapStat value={`${data.photos.length}`} label="사진" />
            <RecapStat value={`${Math.round(data.totalSpending / 10000)}만`} label="지출(원)" />
          </div>

          {/* 사진 */}
          {data.photos.length > 0 && (
            <section>
              <SectionTitle>사진</SectionTitle>
              <div className="grid grid-cols-3 gap-1.5">
                {data.photos.slice(0, 9).map((p) => (
                  <PhotoThumb key={p.id} imageUrl={p.imageUrl} />
                ))}
              </div>
              {data.photos.length > 9 && (
                <button type="button" onClick={() => navigate(`/groups/${groupId}?tab=gallery`)}
                  className="mt-2 text-[12px] font-bold text-primary">사진 전체 보기 ({data.photos.length}장) →</button>
              )}
            </section>
          )}

          {/* 방문 장소 */}
          {data.bookmarks.length > 0 && (
            <section>
              <SectionTitle>다녀온 장소</SectionTitle>
              <div className="space-y-2">
                {data.bookmarks.map((b) => {
                  const src = placePhotoSrc(b.place.photoUrl);
                  return (
                    <div key={b.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-2.5">
                      <div className="size-12 shrink-0 overflow-hidden rounded-[10px] bg-skeleton">
                        {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-bold text-foreground">{b.place.name}</div>
                        {b.place.address && <div className="truncate text-[12px] text-muted">{b.place.address}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {data.photos.length === 0 && data.bookmarks.length === 0 && (
            <p className="py-6 text-center text-[13px] text-muted">아직 담은 장소나 사진이 없어요.</p>
          )}

          <Button fullWidth size="lg" onClick={share}>리캡 공유하기</Button>
        </div>
      )}
    </AppLayout>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-[13px] font-extrabold tracking-wide text-muted">{children}</h2>;
}

function RecapStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-1 py-3 text-center">
      <div className="text-[18px] font-extrabold text-primary">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

/** 갤러리 사진은 인증 필요 → blob object URL로 표시. 언마운트 시 revoke. */
function PhotoThumb({ imageUrl }: { imageUrl: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    fetchPhotoObjectUrl(imageUrl)
      .then((o) => {
        if (active) {
          objectUrl = o;
          setUrl(o);
        } else {
          URL.revokeObjectURL(o);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);
  return (
    <div className="aspect-square overflow-hidden rounded-lg bg-skeleton">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}
