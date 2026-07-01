import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import { changeAccommodationPlace } from '../../api/accommodation';
import { searchPlaces, placePhotoSrc } from '../../api/place';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import type { Accommodation } from '../../types/accommodation';
import type { PlaceSearchResult } from '../../types/place';

interface Props {
  groupId: number;
  accommodation: Accommodation;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * 숙소 상세주소(장소) 변경 — 이름/주소로 다시 검색해 다른 숙소로 교체한다.
 * 구글맵에 없는 숙소는 카카오맵에서 정확한 이름/주소를 확인한 뒤 그 이름으로 검색한다.
 */
export default function AccommodationPlaceEditModal({ groupId, accommodation, onClose, onChanged }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const page = await searchPlaces(groupId, query.trim(), 'LODGING');
      setResults(page.items);
      setSearched(true);
    } catch {
      toast.error('검색에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSearching(false);
    }
  };

  const changeMut = useMutation({
    mutationFn: (place: PlaceSearchResult) =>
      changeAccommodationPlace(groupId, accommodation.id, {
        googlePlaceId: place.googlePlaceId,
        sigungu: accommodation.sigungu ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.accommodations(groupId) });
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.bookmarks(groupId) });
      toast.success('숙소 장소를 변경했어요');
      onChanged();
      onClose();
    },
    onError: () => toast.error('변경에 실패했어요', '잠시 후 다시 시도해 주세요.'),
  });

  return (
    <Modal
      open
      onClose={() => !changeMut.isPending && onClose()}
      title="숙소 장소 변경"
      footer={
        <Button variant="ghost" fullWidth className="border border-border" onClick={onClose} disabled={changeMut.isPending}>
          닫기
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="rounded-card bg-[#FAFAFF] px-3 py-2 text-[12px] leading-snug text-muted">
          현재: <b className="text-foreground">{accommodation.place.name}</b>
          <br />
          숙소 이름이나 주소로 검색해 다른 곳으로 바꿀 수 있어요. 구글맵에 없는 숙소는 카카오맵에서 정확한 이름을
          확인한 뒤 그 이름으로 검색해 주세요.
        </p>

        <form onSubmit={runSearch} className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="숙소 이름 / 주소 검색"
            />
          </div>
          <Button type="submit" loading={searching} disabled={!query.trim()}>
            검색
          </Button>
        </form>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {searched && results.length === 0 && !searching && (
            <p className="py-6 text-center text-[13px] text-muted">검색 결과가 없어요. 다른 이름/주소로 시도해 보세요.</p>
          )}
          {results.map((r) => {
            const src = placePhotoSrc(r.photoUrl);
            return (
              <button
                key={r.googlePlaceId}
                type="button"
                disabled={changeMut.isPending}
                onClick={() => changeMut.mutate(r)}
                className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-2 text-left hover:border-primary disabled:opacity-50"
              >
                <div className="size-11 shrink-0 overflow-hidden rounded-[8px] bg-skeleton">
                  {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-foreground">{r.name}</div>
                  {r.address && <div className="truncate text-[11px] text-muted">{r.address}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
