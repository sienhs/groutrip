import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import RadarChart from './RadarChart';
import { getPersona } from './persona';
import { getMyPreference } from '../../api/survey';
import { appQueryKeys } from '../../queryKeys/appQueryKeys';
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

  // 라우터 state로 받았으면 그대로 쓰고, 직접 진입/새로고침이면 저장된 성향을 조회한다.
  const { data: fetchedPreference, isLoading } = useQuery({
    queryKey: appQueryKeys.myPreference(),
    queryFn: getMyPreference,
    enabled: !statePreference,
  });
  const preference: UserPreference | null = statePreference ?? fetchedPreference ?? null;
  const loading = !statePreference && isLoading;

  if (loading) {
    return (
      <AppLayout title="내 성향" showBack>
        <SkeletonCard />
      </AppLayout>
    );
  }

  if (!preference) {
    return (
      <AppLayout title="내 성향" showBack>
        <div className="mt-10">
          <EmptyState
            title="아직 분석 결과가 없어요"
            description="취향 설문을 먼저 진행해 주세요."
            action={<Button onClick={() => navigate('/survey')}>설문 시작하기</Button>}
          />
        </div>
      </AppLayout>
    );
  }

  const persona = getPersona(preference);
  const radarData = DIMENSIONS.map((dim) => ({
    label: DIMENSION_META[dim].label,
    value: prefValue(preference, dim),
  }));

  return (
    <AppLayout title="내 성향" showBack>
      <div className="py-2">
        <div className="text-center">
          <p className="text-[12px] font-extrabold tracking-wider text-muted">나의 여행 페르소나</p>
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
                  <span className="text-[#C25478]">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-skeleton">
                  {/* 동적 값 — 인라인 style 사용 */}
                  <div className="h-full rounded-full bg-gradient-to-r from-[#F3B9CB] to-[#D9577F]" style={{ width: `${pct}%` }} />
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
    </AppLayout>
  );
}
