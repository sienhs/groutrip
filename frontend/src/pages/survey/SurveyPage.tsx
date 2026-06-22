import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { getSurveyQuestions, submitSurvey } from '../../api/survey';
import { DIMENSION_META, type SurveyQuestion } from '../../types/survey';
import { cn } from '../../lib/cn';

type Step = 'intro' | 'questions';

const SCALE = [1, 2, 3, 4, 5];
const SCALE_SIZE = ['size-14', 'size-12', 'size-10', 'size-12', 'size-14'];

/**
 * 취향 설문 (인트로 → 1~5 척도 문항 → 제출).
 * 제출 결과(UserPreference)는 라우터 state 로 /survey/result 에 전달.
 * 데이터 페칭은 로컬 상태(axios) — React Query 도입 시 useQuery/useMutation 로 이관.
 */
export default function SurveyPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [step, setStep] = useState<Step>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getSurveyQuestions();
      setQuestions([...data].sort((a, b) => a.displayOrder - b.displayOrder));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const total = questions.length;
  const current = questions[index];
  const progress = total ? Math.round(((index + 1) / total) * 100) : 0;

  const handleSelect = async (score: number) => {
    if (!current) return;
    const nextAnswers = { ...answers, [current.id]: score };
    setAnswers(nextAnswers);

    if (index + 1 < total) {
      setIndex(index + 1);
      return;
    }
    // 마지막 문항 → 제출
    setSubmitting(true);
    try {
      const preference = await submitSurvey({
        answers: Object.entries(nextAnswers).map(([questionId, s]) => ({
          questionId: Number(questionId),
          score: s,
        })),
      });
      navigate('/survey/result', { state: { preference } });
    } catch {
      toast.error('제출에 실패했어요', '잠시 후 다시 시도해 주세요.');
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (index > 0) setIndex(index - 1);
    else setStep('intro');
  };

  /* ── 로딩 / 에러 ── */
  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 bg-background px-6">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton variant="rect" className="h-40" />
        <Skeleton className="h-12" />
      </div>
    );
  }
  if (loadError || total === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-[15px] font-bold text-[#3A322B]">설문을 불러오지 못했어요</p>
        <Button variant="secondary" onClick={load}>다시 시도</Button>
      </div>
    );
  }

  /* ── 인트로 ── */
  if (step === 'intro') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-6 py-8">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex size-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#FFCBA6] to-primary text-[44px] shadow-lg">
            🧭
          </div>
          <h1 className="mt-6 text-[23px] font-extrabold tracking-tight">나의 여행 취향 찾기</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            {total}개의 짧은 질문으로 여행 성향을 분석해
            <br />딱 맞는 장소를 추천해 드려요.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {Object.values(DIMENSION_META).map((m) => (
              <span key={m.label} className="rounded-full bg-[#FFF1E6] px-3 py-1.5 text-[12px] font-bold text-[#E8742E]">
                {m.label}
              </span>
            ))}
          </div>
        </div>
        <Button size="lg" fullWidth onClick={() => setStep('questions')}>
          약 1분, 시작하기
        </Button>
        <p className="mt-3 text-center text-[12px] text-muted">나중에 마이페이지에서 다시 할 수 있어요</p>
      </div>
    );
  }

  /* ── 문항 ── */
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <div className="flex items-center gap-3 px-5 pt-4">
        <button
          type="button"
          aria-label="이전"
          onClick={handleBack}
          className="-ml-1.5 flex size-8 items-center justify-center text-[#5C5044]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F0E4D6]">
          {/* 동적 진행률 — 런타임 값이라 인라인 style 사용 */}
          <div className="h-full rounded-full bg-gradient-to-r from-[#FFB585] to-[#FF8A47] transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <span className="min-w-9 text-right text-[13px] font-extrabold text-muted">
          {index + 1}/{total}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 text-center">
        {current && (
          <>
            <p className="text-[12px] font-extrabold tracking-wide text-[#E8742E]">
              {DIMENSION_META[current.dimension].label}
            </p>
            <h2 className="mt-3.5 text-[22px] font-extrabold leading-snug tracking-tight">
              {current.content}
            </h2>
          </>
        )}
      </div>

      <div className="px-6 pb-8">
        <div className="flex items-center justify-between gap-1.5" role="radiogroup" aria-label="동의 정도">
          {SCALE.map((n, i) => {
            const selected = current ? answers[current.id] === n : false;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${n}점`}
                disabled={submitting}
                onClick={() => handleSelect(n)}
                className={cn(
                  'flex items-center justify-center rounded-full border-2 transition-colors',
                  SCALE_SIZE[i],
                  selected ? 'border-primary bg-primary' : 'border-[#E7D7C5] bg-surface hover:border-[#FFCBA6]',
                )}
              >
                <span className={cn('size-2.5 rounded-full', selected ? 'bg-white' : 'bg-[#F0E4D6]')} />
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between text-[12px] font-bold text-muted">
          <span>전혀 아니다</span>
          <span>매우 그렇다</span>
        </div>
      </div>
    </div>
  );
}
