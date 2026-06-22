import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { useCreateGroupMutation } from '../../hooks/useGroupQueries';
import type { ApiResponse } from '../../types/auth';
import type { GroupRequest } from '../../types/group';

const COVER_OPTIONS = [
  { key: 'cover-sunset', label: '노을', style: 'from-orange-300 to-rose-300' },
  { key: 'cover-ocean', label: '바다', style: 'from-sky-300 to-blue-400' },
  { key: 'cover-forest', label: '숲', style: 'from-emerald-300 to-teal-400' },
  { key: 'cover-lavender', label: '라벤더', style: 'from-violet-300 to-fuchsia-300' },
  { key: 'cover-lemon', label: '레몬', style: 'from-yellow-200 to-orange-300' },
  { key: 'cover-night', label: '밤하늘', style: 'from-indigo-400 to-slate-600' },
  { key: 'cover-mint', label: '민트', style: 'from-cyan-200 to-emerald-300' },
  { key: 'cover-peach', label: '복숭아', style: 'from-pink-200 to-orange-200' },
];

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMaximumEndDate(startDate: string): string | undefined {
  if (!startDate) {
    return undefined;
  }
  const maximum = new Date(`${startDate}T00:00:00`);
  maximum.setDate(maximum.getDate() + 29);
  return formatLocalDate(maximum);
}

export default function GroupCreatePage() {
  const navigate = useNavigate();
  const createGroup = useCreateGroupMutation();
  const today = formatLocalDate(new Date());
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const maximumEndDate = getMaximumEndDate(startDate);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    const nextMaximum = getMaximumEndDate(value);
    if (endDate && (endDate < value || (nextMaximum && endDate > nextMaximum))) {
      setEndDate('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    const trimmedDestination = destination.trim();
    if (!trimmedTitle || !trimmedDestination || !startDate || !endDate) {
      setError('필수 정보를 모두 입력해 주세요.');
      return;
    }
    if (endDate < startDate) {
      setError('종료일은 시작일보다 빠를 수 없어요.');
      return;
    }
    if (maximumEndDate && endDate > maximumEndDate) {
      setError('여행 기간은 최대 30일까지 설정할 수 있어요.');
      return;
    }

    const request: GroupRequest = {
      title: trimmedTitle,
      destination: trimmedDestination,
      startDate,
      endDate,
      coverImageKey,
    };

    try {
      await createGroup.mutateAsync(request);
      navigate('/');
    } catch (caughtError) {
      const axiosError = caughtError as AxiosError<ApiResponse<null>>;
      setError(axiosError.response?.data?.message ?? '그룹을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  const inputClassName =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-[#FF9F66] focus:ring-2 focus:ring-orange-100';

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-sm font-semibold text-gray-500 hover:text-[#FF9F66]">
          ← 여행 목록
        </Link>

        <header className="mb-8 mt-6">
          <p className="mb-2 text-sm font-semibold text-[#FF9F66]">새 여행</p>
          <h1 className="text-3xl font-bold text-gray-900">어떤 여행을 계획할까요?</h1>
          <p className="mt-3 text-sm text-gray-500">기본 정보는 그룹을 만든 뒤에도 수정할 수 있어요.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-7 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div>
            <label htmlFor="group-title" className="mb-2 block text-sm font-semibold text-gray-700">
              여행 이름 <span className="text-[#FF9F66]">*</span>
            </label>
            <input
              id="group-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={30}
              required
              placeholder="예: 제주도 우정 여행"
              className={inputClassName}
            />
            <p className="mt-1.5 text-right text-xs text-gray-400">{title.length}/30</p>
          </div>

          <div>
            <label htmlFor="group-destination" className="mb-2 block text-sm font-semibold text-gray-700">
              목적지 <span className="text-[#FF9F66]">*</span>
            </label>
            <input
              id="group-destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              maxLength={100}
              required
              placeholder="도시, 지역 또는 국가를 입력하세요"
              className={inputClassName}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-700">
              여행 기간 <span className="text-[#FF9F66]">*</span>
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="group-start-date" className="mb-1.5 block text-xs text-gray-500">시작일</label>
                <input
                  id="group-start-date"
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={(event) => handleStartDateChange(event.target.value)}
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="group-end-date" className="mb-1.5 block text-xs text-gray-500">종료일</label>
                <input
                  id="group-end-date"
                  type="date"
                  value={endDate}
                  min={startDate || today}
                  max={maximumEndDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                  disabled={!startDate}
                  className={`${inputClassName} disabled:cursor-not-allowed disabled:bg-gray-50`}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">오늘 이후 날짜로 최대 30일까지 계획할 수 있어요.</p>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-gray-700">커버 색상</legend>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {COVER_OPTIONS.map((cover) => (
                <button
                  key={cover.key}
                  type="button"
                  title={cover.label}
                  aria-label={`${cover.label} 커버 선택`}
                  aria-pressed={coverImageKey === cover.key}
                  onClick={() => setCoverImageKey(coverImageKey === cover.key ? null : cover.key)}
                  className={`aspect-square rounded-xl bg-gradient-to-br ${cover.style} transition focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 ${
                    coverImageKey === cover.key ? 'scale-95 ring-2 ring-[#FF9F66] ring-offset-2' : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={createGroup.isPending}
            className="w-full rounded-lg bg-[#FF9F66] px-5 py-3.5 font-semibold text-white transition-colors hover:bg-[#f08c52] focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createGroup.isPending ? '그룹 만드는 중...' : '여행 그룹 만들기'}
          </button>
        </form>
      </div>
    </main>
  );
}
