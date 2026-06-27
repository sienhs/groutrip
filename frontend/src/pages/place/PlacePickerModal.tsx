import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import { getBookmarks, addBookmark, searchPlaces } from '../../api/place';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import { cn } from '../../lib/cn';
import type { PlaceSearchResult } from '../../types/place';

interface Props {
  groupId: number;
  title?: string;
  description?: string;
  onClose: () => void;
  /** 선택한 장소의 내부 placeId를 돌려준다(검색 선택 시 보관함에 담아 확보). */
  onPick: (placeId: number) => Promise<void> | void;
}

/**
 * 장소 선택 모달 — 보관함에서 고르거나 검색해서 고른다.
 * 검색 결과는 보관함에 담아 placeId를 확보한 뒤 onPick으로 전달한다(이미 담긴 건 재사용).
 */
export default function PlacePickerModal({ groupId, title = '장소 선택', description, onClose, onPick }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'bookmark' | 'search'>('bookmark');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const { data: bookmarks = [], isLoading: bmLoading, isError: bmError } = useQuery({
    queryKey: groupQueryKeys.bookmarks(groupId),
    queryFn: () => getBookmarks(groupId),
  });
  useEffect(() => {
    if (bmError) toast.error('보관함을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
  }, [bmError, toast]);

  const searchMutation = useMutation({
    mutationFn: (q: string) => searchPlaces(groupId, q),
    onSuccess: (res) => setResults(res.items),
    onError: () => toast.error('검색에 실패했어요', '잠시 후 다시 시도해 주세요.'),
  });
  const searching = searchMutation.isPending;
  const runSearch = () => { if (query.trim()) searchMutation.mutate(query.trim()); };

  const pickBookmark = async (placeId: number, key: string) => {
    setBusyKey(key);
    try {
      await onPick(placeId);
    } finally {
      setBusyKey(null);
    }
  };

  const pickSearched = async (p: PlaceSearchResult) => {
    setBusyKey(p.googlePlaceId);
    try {
      let placeId: number;
      const isNonGoogle = p.googlePlaceId.startsWith('kakao:') || p.googlePlaceId.startsWith('manual:');
      try {
        placeId = (await addBookmark(groupId, {
          googlePlaceId: p.googlePlaceId,
          categoryTag: p.category,
          ...(isNonGoogle ? {
            name: p.name,
            address: p.address ?? undefined,
            latitude: p.latitude,
            longitude: p.longitude,
          } : {}),
        })).place.placeId;
        queryClient.invalidateQueries({ queryKey: groupQueryKeys.bookmarks(groupId) });
      } catch {
        const found = (await getBookmarks(groupId)).find((b) => b.place.googlePlaceId === p.googlePlaceId);
        if (!found) throw new Error('placeId 확보 실패');
        placeId = found.place.placeId;
      }
      await onPick(placeId);
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error('선택하지 못했어요', message ?? '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Modal open onClose={onClose} title={title} description={description}>
      <div className="space-y-3">
        <div className="flex gap-1.5">
          {([
            { v: 'bookmark', label: '보관함' },
            { v: 'search', label: '검색' },
          ] as const).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setTab(o.v)}
              aria-pressed={tab === o.v}
              className={cn(
                'flex-1 rounded-button px-2 py-2 text-[13px] font-bold transition-colors',
                tab === o.v ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-muted',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        {tab === 'bookmark' ? (
          bmLoading ? (
            <p className="py-8 text-center text-[13px] text-muted">불러오는 중…</p>
          ) : bookmarks.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted">보관함이 비어 있어요. ‘검색’ 탭에서 찾아보세요.</p>
          ) : (
            <div className="max-h-[46vh] space-y-2 overflow-y-auto">
              {bookmarks.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold text-foreground">{b.place.name}</div>
                    {b.place.address && <div className="truncate text-[12px] text-muted">{b.place.address}</div>}
                  </div>
                  <Button size="sm" disabled={busyKey != null} loading={busyKey === `bm-${b.id}`} onClick={() => pickBookmark(b.place.placeId, `bm-${b.id}`)}>
                    선택
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="장소·키워드 검색"
              />
              <Button onClick={runSearch} loading={searching} disabled={!query.trim()}>검색</Button>
            </div>
            {results.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted">검색 결과가 여기에 표시돼요.</p>
            ) : (
              <div className="max-h-[40vh] space-y-2 overflow-y-auto">
                {results.map((p) => (
                  <div key={p.googlePlaceId} className="flex items-center gap-3 rounded-card border border-border bg-surface p-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold text-foreground">{p.name}</div>
                      {p.address && <div className="truncate text-[12px] text-muted">{p.address}</div>}
                    </div>
                    <Button size="sm" disabled={busyKey != null} loading={busyKey === p.googlePlaceId} onClick={() => pickSearched(p)}>
                      선택
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
