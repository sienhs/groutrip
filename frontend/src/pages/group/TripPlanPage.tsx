import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useToast } from '../../components/Toast';
import { PlacePhoto, StarRating } from '../place/PlaceBits';
import { getGroup } from '../../api/group';
import { searchPlaces, addBookmark } from '../../api/place';
import { getRecommendations } from '../../api/recommend';
import {
  selectAccommodation,
  getAccommodations,
  confirmBooking,
} from '../../api/accommodation';
import { sigunguOptionsFor } from '../../lib/regions';
import { naverPlaceUrl } from '../../lib/naver';
import { cn } from '../../lib/cn';
import { CATEGORY_LABEL, type PlaceCategory, type PlaceSearchResult } from '../../types/place';
import { contentTypeLabel, type RecommendItem } from '../../types/recommend';
import type { Accommodation } from '../../types/accommodation';

type Step =
  | 'loading'
  | 'start'
  | 'sigungu'
  | 'accommodation'
  | 'booking'
  | 'hub'
  | 'recommend'
  | 'placeselect';

// 위저드에서 반복 담기로 선정할 장소 카테고리.
const PICK_CATEGORIES: { value: PlaceCategory; label: string; keyword: string }[] = [
  { value: 'RESTAURANT', label: '맛집', keyword: '맛집' },
  { value: 'TOURIST_ATTRACTION', label: '명소', keyword: '명소' },
  { value: 'CAFE', label: '카페', keyword: '카페' },
];

/**
 * 여행 계획 시작 플로우(목적지 정하기).
 *  start → [지역만 정해서 추천받기 | 상세주소 입력하기]
 *  지역 경로: 시군구 선택 → 숙소 선정(Google lodging) → 네이버 최저가 핸드오프 → 예약가/사진 기록.
 * 숙소 예약 기록까지가 이번 단계. 이후(갈 만한 곳 추천 등)는 별도로 이어붙인다.
 */
export default function TripPlanPage() {
  const params = useParams<{ id: string }>();
  const groupId = Number(params.id);
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState<Step>('loading');
  const [mode, setMode] = useState<'region' | 'address'>('region');
  const [destination, setDestination] = useState('');
  const [sigunguOptions, setSigunguOptions] = useState<string[]>([]);
  const [sigungu, setSigungu] = useState('');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const [current, setCurrent] = useState<Accommodation | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [price, setPrice] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 갈 만한 곳 추천(위저드 내)
  const [recs, setRecs] = useState<RecommendItem[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  // 맛집/명소 선정 반복(보관함 담기)
  const [pickCategory, setPickCategory] = useState<PlaceCategory>('RESTAURANT');
  const [pickQuery, setPickQuery] = useState('');
  const [pickResults, setPickResults] = useState<PlaceSearchResult[]>([]);
  const [pickNext, setPickNext] = useState<string | null>(null);
  const [pickSearching, setPickSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  // 그룹 목적지 + 진행 중 숙소(SELECTED)를 불러와 재진입 시 예약 단계로 복원한다.
  useEffect(() => {
    (async () => {
      try {
        const [g, accs] = await Promise.all([getGroup(groupId), getAccommodations(groupId)]);
        setDestination(g.destination);
        setSigunguOptions(sigunguOptionsFor(g.destination));
        const selected = accs.find((a) => a.status === 'SELECTED');
        const booked = accs.find((a) => a.status === 'BOOKED');
        if (selected) {
          setCurrent(selected);
          setSigungu(selected.sigungu ?? '');
          setStep('booking');
        } else if (booked) {
          setCurrent(booked);
          setSigungu(booked.sigungu ?? '');
          setStep('hub');
        } else {
          setStep('start');
        }
      } catch {
        toast.error('계획 정보를 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
        setStep('start');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const runSearch = async (q: string, token?: string) => {
    if (!q.trim()) {
      setResults([]);
      setNextToken(null);
      return;
    }
    setSearching(true);
    try {
      const page = await searchPlaces(groupId, q.trim(), 'LODGING', token);
      setResults((prev) => (token ? [...prev, ...page.items] : page.items));
      setNextToken(page.nextPageToken);
    } catch {
      toast.error('숙소 검색에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSearching(false);
    }
  };

  const goAccommodation = (presetQuery: string) => {
    setQuery(presetQuery);
    setResults([]);
    setNextToken(null);
    setStep('accommodation');
    void runSearch(presetQuery);
  };

  const chooseRegion = () => {
    setMode('region');
    if (sigunguOptions.length > 0) {
      setStep('sigungu');
    } else {
      setSigungu('');
      goAccommodation(destination);
    }
  };

  const chooseAddress = () => {
    setMode('address');
    setSigungu('');
    setQuery('');
    setResults([]);
    setNextToken(null);
    setStep('accommodation');
  };

  const pickSigungu = (s: string) => {
    setSigungu(s);
    goAccommodation(s);
  };

  const handleSelectPlace = async (place: PlaceSearchResult) => {
    setSelectingId(place.googlePlaceId);
    try {
      const acc = await selectAccommodation(groupId, {
        googlePlaceId: place.googlePlaceId,
        sigungu: sigungu || undefined,
      });
      setCurrent(acc);
      setShowBookingForm(false);
      setPrice('');
      setPhoto(null);
      setStep('booking');
    } catch {
      toast.error('숙소 선정에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSelectingId(null);
    }
  };

  const openBookingSite = () => {
    if (current) window.open(current.bookingSearchUrl, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmBooking = async () => {
    if (!current || (!price && !photo)) return;
    setSubmitting(true);
    try {
      const acc = await confirmBooking(groupId, current.id, {
        reservationPrice: price ? Number(price) : undefined,
        photo: photo ?? undefined,
      });
      setCurrent(acc);
      setStep('hub');
      toast.success('예약을 기록했어요', acc.place.name);
    } catch {
      toast.error('예약 기록에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // 갈 만한 곳 추천(위저드 내). 그룹 목적지·성향 기반 TourAPI 추천을 그대로 보여준다.
  const loadRecommendations = async () => {
    setStep('recommend');
    setRecLoading(true);
    try {
      setRecs(await getRecommendations(groupId));
    } catch {
      toast.error('추천을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setRecLoading(false);
    }
  };

  // 맛집/명소/카페 선정 반복 — 검색해 보관함에 담는다(여러 개 가능).
  const openPlaceSelect = (cat: PlaceCategory) => {
    const region = sigungu || destination;
    const keyword = PICK_CATEGORIES.find((c) => c.value === cat)?.keyword ?? '';
    const q = `${region} ${keyword}`.trim();
    setPickCategory(cat);
    setPickQuery(q);
    setPickResults([]);
    setPickNext(null);
    setStep('placeselect');
    void runPickSearch(q, cat);
  };

  const runPickSearch = async (q: string, cat: PlaceCategory, token?: string) => {
    if (!q.trim()) {
      setPickResults([]);
      setPickNext(null);
      return;
    }
    setPickSearching(true);
    try {
      const page = await searchPlaces(groupId, q.trim(), cat, token);
      setPickResults((prev) => (token ? [...prev, ...page.items] : page.items));
      setPickNext(page.nextPageToken);
    } catch {
      toast.error('검색에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setPickSearching(false);
    }
  };

  const handleAddBookmark = async (place: PlaceSearchResult) => {
    setAddingId(place.googlePlaceId);
    try {
      await addBookmark(groupId, { googlePlaceId: place.googlePlaceId, categoryTag: pickCategory });
      setAddedIds((prev) => new Set(prev).add(place.googlePlaceId));
      toast.success('보관함에 담았어요', place.name);
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 409) {
        setAddedIds((prev) => new Set(prev).add(place.googlePlaceId));
        toast.info('이미 담긴 장소예요', place.name);
      } else {
        toast.error('담기에 실패했어요', '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setAddingId(null);
    }
  };

  const stepTitle =
    step === 'sigungu'
      ? '지역 선택'
      : step === 'accommodation'
        ? '숙소 선정'
        : step === 'booking'
          ? '숙소 예약'
          : step === 'hub'
            ? '여행 계획'
            : step === 'recommend'
              ? '갈 만한 곳 추천'
              : step === 'placeselect'
                ? `${CATEGORY_LABEL[pickCategory]} 선정`
                : '여행 계획 시작';

  return (
    <AppLayout title={stepTitle} showBack hideBottomNav>
      {step === 'loading' && <p className="py-16 text-center text-[13px] text-muted">불러오는 중…</p>}

      {step === 'start' && (
        <div className="space-y-4">
          <div>
            <p className="text-[13px] font-bold text-[#3A322B]">목적지 · {destination}</p>
            <p className="mt-1 text-[13px] text-muted">어떻게 장소를 정해볼까요?</p>
          </div>
          <ChoiceCard
            title="지역만 정해서 추천받기"
            desc="시·군·구를 고르고 숙소 선정 → 갈 만한 곳 추천을 단계별로 진행해요."
            onClick={chooseRegion}
          />
          <ChoiceCard
            title="상세주소 입력하기"
            desc="숙소나 가고 싶은 곳을 이미 정했다면, 바로 검색해서 장소를 정해요."
            onClick={chooseAddress}
          />
        </div>
      )}

      {step === 'sigungu' && (
        <div className="space-y-4">
          <StepBack onClick={() => setStep('start')} label="다른 방법으로 시작" />
          <p className="text-[13px] text-muted">
            <b className="text-[#3A322B]">{destination}</b> 안에서 여행할 시·군·구를 골라주세요.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {sigunguOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickSigungu(s)}
                className="rounded-card border border-border bg-surface px-3 py-3 text-[14px] font-semibold text-[#3A322B] active:scale-[0.98]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'accommodation' && (
        <div className="space-y-3.5">
          <StepBack
            onClick={() => setStep(mode === 'region' && sigunguOptions.length > 0 ? 'sigungu' : 'start')}
            label="이전"
          />
          <p className="text-[13px] text-muted">
            {mode === 'address'
              ? '숙소명이나 지역·주소로 검색해 숙소를 선정하세요.'
              : '숙소를 골라 선정하세요.'}
          </p>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
              placeholder="예: 제주 신라호텔, 용인 숙소"
            />
            <Button onClick={() => runSearch(query)} loading={searching} disabled={!query.trim()}>
              검색
            </Button>
          </div>

          {results.length === 0 && !searching && (
            <p className="py-10 text-center text-[13px] text-muted">검색 결과가 여기에 표시돼요.</p>
          )}

          <div className="space-y-2.5">
            {results.map((p) => (
              <div
                key={p.googlePlaceId}
                className="flex gap-3 rounded-card border border-border bg-surface p-2.5"
              >
                <PlacePhoto
                  photoUrl={p.photoUrl}
                  category="LODGING"
                  name={p.name}
                  naverHref={naverPlaceUrl(p.name, p.address)}
                  className="size-[68px] shrink-0 rounded-[10px]"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="truncate text-[15px] font-extrabold text-[#3A322B]">{p.name}</div>
                  <div className="truncate text-[12px] text-muted">{p.address ?? '주소 정보 없음'}</div>
                  <div className="mt-1">
                    <StarRating value={p.rating} count={p.ratingCount} />
                  </div>
                  <div className="mt-auto pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleSelectPlace(p)}
                      loading={selectingId === p.googlePlaceId}
                      disabled={!!selectingId}
                    >
                      이 숙소로 선정
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {nextToken && (
            <Button variant="secondary" fullWidth onClick={() => runSearch(query, nextToken)} loading={searching}>
              더 보기
            </Button>
          )}
        </div>
      )}

      {step === 'booking' && current && (
        <div className="space-y-4">
          <StepBack onClick={() => setStep('accommodation')} label="숙소 다시 고르기" />

          {/* 선정 숙소 카드 */}
          <div className="flex gap-3 rounded-card border border-border bg-surface p-3">
            <PlacePhoto
              photoUrl={current.place.photoUrl}
              category="LODGING"
              name={current.place.name}
              naverHref={naverPlaceUrl(current.place.name, current.place.address)}
              className="size-[72px] shrink-0 rounded-[10px]"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-extrabold text-[#3A322B]">{current.place.name}</div>
              <div className="truncate text-[12px] text-muted">{current.place.address ?? ''}</div>
              <div className="mt-1">
                <StarRating value={current.place.rating} count={current.place.ratingCount} />
              </div>
            </div>
          </div>

          {/* 1) 가격 비교 핸드오프 — 구글 지도(정확한 그 숙소의 OTA 최저가 비교)를 우선, 네이버 검색은 보조 */}
          <div className="rounded-card border border-border bg-surface p-3.5">
            <p className="text-[14px] font-bold text-[#3A322B]">① 가격 비교하고 예약하기</p>
            <p className="mt-1 text-[13px] text-muted">
              <b>{current.place.name}</b>의 예약 사이트별 가격을 비교하고 예약을 진행하세요.
            </p>
            {current.place.googleMapsUri && (
              <Button
                variant="secondary"
                fullWidth
                className="mt-3"
                onClick={() => window.open(current.place.googleMapsUri!, '_blank', 'noopener,noreferrer')}
              >
                구글 지도에서 가격 비교 ↗
              </Button>
            )}
            <Button variant="ghost" fullWidth className="mt-2 border border-border" onClick={openBookingSite}>
              네이버에서 검색 ↗
            </Button>
          </div>

          {/* 2) 예약 완료 확인 */}
          <div className="rounded-card border border-border bg-surface p-3.5">
            <p className="text-[14px] font-bold text-[#3A322B]">② 숙소 예약을 완료했나요?</p>
            {!showBookingForm ? (
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" fullWidth onClick={() => toast.info('괜찮아요', '예약을 마치면 다시 눌러주세요.')}>
                  아직이요
                </Button>
                <Button fullWidth onClick={() => setShowBookingForm(true)}>
                  네, 예약했어요
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <Input
                  label="예약 금액 (원)"
                  type="number"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="예: 250000"
                  helper={price ? `${Number(price).toLocaleString()}원` : '가격 또는 예약완료 사진 중 하나만 있어도 돼요.'}
                />

                <div>
                  <span className="mb-1.5 block text-[13px] font-bold text-[#3A322B]">예약완료 사진 (선택)</span>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center justify-center rounded-button border border-dashed border-[#FFCBA6] bg-[#FFF7F0]',
                      'px-3 py-3 text-[13px] font-bold text-[#E8742E]',
                    )}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                    />
                    {photo ? '사진 변경' : '가격이 보이는 예약 완료 화면 첨부'}
                  </label>
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="예약 완료 사진 미리보기"
                      className="mt-2 max-h-56 w-full rounded-[10px] object-contain"
                    />
                  )}
                </div>

                <Button
                  fullWidth
                  size="lg"
                  onClick={handleConfirmBooking}
                  loading={submitting}
                  disabled={!price && !photo}
                >
                  예약 완료 기록
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'hub' && current && (
        <div className="space-y-4">
          <div className="rounded-card border border-[#CDE9C7] bg-[#F2FBF0] p-4">
            <div className="text-[14px] font-extrabold text-[#3A322B]">숙소 예약 완료 ✓</div>
            <div className="mt-1 text-[13px] text-[#5A6B54]">
              {current.place.name}
              {current.reservationPrice != null && ` · ${current.reservationPrice.toLocaleString()}원`}
              {current.reservationPrice == null && current.bookingPhotoUrl && ' · 예약 사진 첨부됨'}
            </div>
            {current.reservationPrice != null && (
              <div className="mt-1 text-[12px] font-semibold text-[#7FAE6B]">
                숙박비가 정산(균등 분담)에 자동 추가됐어요 · 보관함에도 담겼어요
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-bold text-[#3A322B]">다음으로 무엇을 해볼까요?</p>
            <div className="space-y-2.5">
              <ChoiceCard
                title="갈 만한 곳 추천받기"
                desc="목적지와 그룹 성향에 맞는 관광지를 추천해 드려요."
                onClick={loadRecommendations}
              />
              <ChoiceCard
                title="맛집 선정하기"
                desc="이 지역 맛집을 검색해 보관함에 담아요."
                onClick={() => openPlaceSelect('RESTAURANT')}
              />
              <ChoiceCard
                title="명소 선정하기"
                desc="가볼 만한 명소를 검색해 보관함에 담아요."
                onClick={() => openPlaceSelect('TOURIST_ATTRACTION')}
              />
            </div>
          </div>

          <Button variant="ghost" fullWidth onClick={() => navigate(`/groups/${groupId}`)}>
            그룹으로 돌아가기
          </Button>
        </div>
      )}

      {step === 'recommend' && (
        <div className="space-y-3.5">
          <StepBack onClick={() => setStep('hub')} label="여행 계획으로" />
          {recLoading ? (
            <p className="py-12 text-center text-[13px] text-muted">추천을 불러오는 중…</p>
          ) : recs.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-muted">추천 결과가 없어요.</p>
          ) : (
            <div className="space-y-2.5">
              {recs.map((r) => (
                <div key={r.contentId} className="flex gap-3 rounded-card border border-border bg-surface p-2.5">
                  <a
                    href={naverPlaceUrl(r.title, r.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative size-[68px] shrink-0 overflow-hidden rounded-[10px]"
                    title="네이버 지도에서 사진·리뷰 보기"
                  >
                    {r.thumbnailUrl ? (
                      <img src={r.thumbnailUrl} alt={r.title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-[#FFF1E6] text-[11px] text-[#FFB585]">
                        {contentTypeLabel(r.contentTypeId)}
                        <span className="text-[9px] font-bold text-[#03C75A]">사진 보기</span>
                      </div>
                    )}
                    <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-[5px] bg-[#03C75A] text-[10px] font-black leading-none text-white shadow">N</span>
                  </a>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="line-clamp-2 text-[14px] font-bold text-[#3A322B]">{r.title}</div>
                    <div className="mt-0.5 text-[12px] text-muted">{contentTypeLabel(r.contentTypeId)}</div>
                    {r.matchScore != null && (
                      <div className="mt-auto pt-1 text-[12px] font-bold text-[#E8742E]">
                        성향 일치 {r.matchScore}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button variant="secondary" fullWidth onClick={() => openPlaceSelect('TOURIST_ATTRACTION')}>
            마음에 드는 명소 담으러 가기
          </Button>
        </div>
      )}

      {step === 'placeselect' && (
        <div className="space-y-3.5">
          <StepBack onClick={() => setStep('hub')} label="여행 계획으로" />

          <div className="flex gap-1.5">
            {PICK_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => openPlaceSelect(c.value)}
                aria-pressed={pickCategory === c.value}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors',
                  pickCategory === c.value
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-surface text-[#7A6A58]',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={pickQuery}
              onChange={(e) => setPickQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runPickSearch(pickQuery, pickCategory)}
              placeholder="검색어"
            />
            <Button onClick={() => runPickSearch(pickQuery, pickCategory)} loading={pickSearching} disabled={!pickQuery.trim()}>
              검색
            </Button>
          </div>

          <p className="text-[12px] text-muted">담은 장소는 그룹 ‘장소’ 탭 보관함에서 볼 수 있어요.</p>

          <div className="space-y-2.5">
            {pickResults.map((p) => {
              const added = addedIds.has(p.googlePlaceId);
              return (
                <div key={p.googlePlaceId} className="flex gap-3 rounded-card border border-border bg-surface p-2.5">
                  <PlacePhoto
                    photoUrl={p.photoUrl}
                    category={pickCategory}
                    name={p.name}
                    naverHref={naverPlaceUrl(p.name, p.address)}
                    className="size-[68px] shrink-0 rounded-[10px]"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="truncate text-[15px] font-extrabold text-[#3A322B]">{p.name}</div>
                    <div className="truncate text-[12px] text-muted">{p.address ?? '주소 정보 없음'}</div>
                    <div className="mt-1">
                      <StarRating value={p.rating} count={p.ratingCount} />
                    </div>
                    <div className="mt-auto pt-2">
                      <Button
                        size="sm"
                        variant={added ? 'secondary' : 'primary'}
                        onClick={() => handleAddBookmark(p)}
                        loading={addingId === p.googlePlaceId}
                        disabled={added}
                      >
                        {added ? '담음 ✓' : '보관함에 담기'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pickNext && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => runPickSearch(pickQuery, pickCategory, pickNext)}
              loading={pickSearching}
            >
              더 보기
            </Button>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function ChoiceCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-card border border-border bg-surface p-4 text-left transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[16px] font-extrabold text-[#3A322B]">{title}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 6l6 6-6 6" stroke="#E8742E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">{desc}</p>
    </button>
  );
}

function StepBack({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#A6907B]"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}
