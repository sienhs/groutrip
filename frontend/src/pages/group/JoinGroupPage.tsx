import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { joinGroup } from '../../api/group';
import { useToast } from '../../components/Toast';
import useAuthStore from '../../store/authStore';
import type { ApiResponse } from '../../types/auth';

/**
 * 초대 링크 진입(/join/:code) — 공개 라우트.
 *
 * 비로그인: 초대 카드를 보여주고 "로그인해서 참여" → /login 으로 이동.
 *           sessionStorage 에 /join/:code 를 저장해 로그인 후 여기로 복귀한다.
 * 로그인:   마운트 즉시 자동 참여 → 그룹 상세로 이동.
 */
export default function JoinGroupPage() {
  const { code = '' } = useParams<{ code: string }>();
  const upperCode = code.toUpperCase();
  const navigate = useNavigate();
  const toast = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const autoJoin = async () => {
      setJoining(true);
      try {
        const group = await joinGroup(upperCode);
        if (cancelled) return;
        toast.success('그룹에 참여했어요', group.title);
        navigate(`/groups/${group.id}`, { replace: true });
      } catch (err) {
        if (cancelled) return;
        const message = (err as AxiosError<ApiResponse<null>>).response?.data?.message;
        toast.error('참여하지 못했어요', message ?? '초대 코드가 유효하지 않거나 만료되었어요.');
        navigate('/groups', { replace: true });
      } finally {
        if (!cancelled) setJoining(false);
      }
    };
    autoJoin();
    return () => { cancelled = true; };
  }, [isAuthenticated, upperCode, navigate, toast]);

  // 로그인 상태 — 자동 참여 중 로딩 화면
  if (isAuthenticated) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="size-14 animate-spin rounded-full border-4 border-[#FCF0F9] border-t-[#C25478]" />
          <p className="text-[14px] font-bold text-muted">
            {joining ? '그룹에 참여하는 중이에요…' : '잠시만 기다려 주세요'}
          </p>
        </div>
      </div>
    );
  }

  // 비로그인 — 초대 미리보기 + 로그인 CTA
  const handleLoginToJoin = () => {
    sessionStorage.setItem('post_login_redirect', `/join/${code}`);
    navigate('/login');
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-12">
      {/* 배경 블러 */}
      <div className="pointer-events-none absolute left-1/3 top-1/4 h-64 w-64 rounded-full bg-[#C25478]/10 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-[#7C3AED]/10 blur-[60px]" />

      <div className="relative w-full max-w-sm">
        {/* 앱 브랜드 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E86A92] to-[#C25478] shadow-lg shadow-[#C25478]/30">
            <span className="text-[26px]">✈️</span>
          </div>
          <p className="text-[11px] font-extrabold tracking-[0.2em] text-[#C25478] uppercase">Groutrip</p>
        </div>

        {/* 초대 카드 */}
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-xl">
          {/* 카드 헤더 그라디언트 */}
          <div className="bg-gradient-to-br from-[#E86A92] to-[#C25478] px-6 py-8 text-center text-white">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-white/20 text-[32px]">
              🎟️
            </div>
            <h1 className="text-[20px] font-extrabold tracking-tight">그룹 초대를 받았어요</h1>
            <p className="mt-1.5 text-[13px] text-white/75">함께 여행 계획을 세워요!</p>
          </div>

          {/* 코드 정보 */}
          <div className="px-6 py-6">
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3.5">
              <span className="text-[13px] text-muted">초대 코드</span>
              <span className="text-[18px] font-extrabold tracking-[0.18em] text-foreground">
                {upperCode}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLoginToJoin}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E86A92] to-[#C25478] py-4 text-[16px] font-extrabold text-white shadow-lg shadow-[#C25478]/30 transition-all active:scale-[.98]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              로그인해서 참여하기
            </button>

            <p className="mt-3.5 text-center text-[12px] leading-relaxed text-muted">
              Google 계정으로 로그인하면 바로 그룹에 합류해요.<br />
              Groutrip이 처음이라면 자동으로 가입돼요.
            </p>
          </div>
        </div>

        {/* 서비스 소개 링크 */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 w-full text-center text-[13px] text-muted hover:text-foreground"
        >
          Groutrip이 뭔가요? →
        </button>
      </div>
    </div>
  );
}
