import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import RadarChart from './RadarChart';
import { getPersona } from './persona';
import { getMyPreference } from '../../api/survey';
import { DIMENSIONS, DIMENSION_META, prefValue, type UserPreference } from '../../types/survey';

interface ResultLocationState {
  preference?: UserPreference;
}

/**
 * 설문 결과 — 5축(확장 시 N축) 레이더 + 페르소나 + 차원별 막대.
 * 제출 직후엔 라우터 state로 받지만, 직접 진입/새로고침이면 저장된 성향(getMyPreference)을 불러온다.
 */
export default function SurveyResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const statePreference = (location.state as ResultLocationState | null)?.preference;

  const [preference, setPreference] = useState<UserPreference | null>(statePreference ?? null);
  // 라우터 state가 없을 때만 서버 조회 → 미응답 판정.
  const [loading, setLoading] = useState(!statePreference);

  useEffect(() => {
    if (statePreference) return;
    let cancelled = false;
    getMyPreference()
      .then((p) => {
        if (!cancelled) setPreference(p);
      })
      .catch(() => {
        if (!cancelled) setPreference(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statePreference]);

  if (loading) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-md bg-background px-6 py-8">
        <SkeletonCard />
      </div>
    );
  }

  if (!preference) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center bg-background px-6">
        <EmptyState
          title="아직 분석 결과가 없어요"
          description="취향 설문을 먼저 진행해 주세요."
          action={<Button onClick={() => navigate('/survey')}>설문 시작하기</Button>}
        />
      </div>
    );
  }

  const persona = getPersona(preference);
  const radarData = DIMENSIONS.map((dim) => ({
    label: DIMENSION_META[dim].label,
    value: prefValue(preference, dim),
  }));

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background">
      <div className="px-6 py-8">
        <div className="text-center">
          <p className="text-[12px] font-extrabold tracking-wider text-[#BCA48C]">나의 여행 페르소나</p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight">
            {persona.emoji} {persona.name}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">{persona.desc}</p>
        </div>

        <div className="mt-3 flex justify-center">
          <RadarChart data={radarData} />
        </div>

        <div className="mt-2 flex flex-col gap-3">
          {DIMENSIONS.map((dim) => {
            const meta = DIMENSION_META[dim];
            const pct = Math.round(prefValue(preference, dim) * 100);
            return (
              <div key={dim}>
                <div className="mb-1.5 flex justify-between text-[13px] font-bold">
                  <span>{meta.label}</span>
                  <span className="text-[#E8742E]">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#F0E4D6]">
                  {/* 동적 값 — 인라인 style 사용 */}
                  <div className="h-full rounded-full bg-gradient-to-r from-[#FFB585] to-[#FF8A47]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <Button size="lg" fullWidth className="mt-6" onClick={() => navigate('/recommend')}>
          추천 장소 보러가기
        </Button>
        <Button
          variant="ghost"
          fullWidth
          className="mt-2 border border-border"
          onClick={() => navigate('/survey')}
        >
          설문 다시하기
        </Button>
      </div>
    </div>
  );
}
