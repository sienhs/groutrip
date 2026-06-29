import { Link } from 'react-router-dom';
import { getOAuthAuthorizationUrl } from '../../api/auth';
import { Card } from '../../components';
import AuthBrand from './AuthBrand';

const FEATURES = [
  {
    emoji: '🗓️',
    title: '함께 만드는 일정',
    desc: '날짜별 일정을 팀원과 실시간으로 함께 짜고, 지도로 동선을 한눈에 확인하세요.',
  },
  {
    emoji: '📍',
    title: '장소 보관함 & 투표',
    desc: '가고 싶은 장소를 모아두고 투표로 결정해요. AI 추천도 받을 수 있어요.',
  },
  {
    emoji: '💸',
    title: '간편 비용 정산',
    desc: '여행 중 쓴 비용을 기록하고, 여행이 끝나면 자동으로 정산해 드려요.',
  },
];

/**
 * 로그인 — SNS(카카오/구글) 전용.
 * PC(md 이상)에서는 서비스 소개와 로그인 폼을 나란히 표시한다.
 */
export default function LoginPage() {
  const handleOAuthLogin = (provider: 'google' | 'kakao') => {
    window.location.assign(getOAuthAuthorizationUrl(provider));
  };

  const loginCard = (
    <div className="w-full max-w-md">
      <AuthBrand subtitle="함께 만드는 우리의 여행" />
      <Card padding="lg">
        <p className="mb-5 text-center text-[13px] text-muted">
          SNS 계정으로 간편하게 시작하세요
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleOAuthLogin('kakao')}
            className="relative flex h-12 w-full items-center justify-center rounded-button bg-[#FEE500] text-sm font-bold text-[#191919] transition hover:brightness-95"
          >
            <svg className="absolute left-4" width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <path fill="#191919" d="M12 3C6.48 3 2 6.48 2 10.8c0 2.79 1.9 5.23 4.74 6.6-.2.72-.74 2.66-.85 3.07-.13.5.18.5.39.36.16-.11 2.58-1.75 3.63-2.47.68.1 1.38.14 2.09.14 5.52 0 10-3.48 10-7.8S17.52 3 12 3Z" />
            </svg>
            카카오로 로그인
          </button>
          <button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            className="relative flex h-12 w-full items-center justify-center rounded-button border border-border bg-white text-sm font-bold text-text transition hover:bg-[#F8F8F8]"
          >
            <svg className="absolute left-4" width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z" />
              <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46Z" />
              <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z" />
              <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z" />
            </svg>
            Google로 로그인
          </button>
        </div>
      </Card>
      <p className="mt-6 text-center text-[12px] text-muted">
        시작하면 <Link to="/terms" className="font-semibold underline underline-offset-2">이용약관</Link>
        {' 및 '}
        <Link to="/privacy" className="font-semibold underline underline-offset-2">개인정보처리방침</Link>
        에 동의하는 것으로 간주됩니다.
      </p>
    </div>
  );

  return (
    <>
      {/* 모바일 레이아웃 */}
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10 md:hidden">
        {loginCard}
      </div>

      {/* PC 레이아웃 (md 이상) */}
      <div className="hidden min-h-dvh md:flex">
        {/* 왼쪽: 서비스 소개 */}
        <div className="flex flex-1 flex-col justify-center bg-gradient-to-br from-[#FFF0F7] to-[#F3ECFF] px-16 py-16 dark:from-[#2A1A23] dark:to-[#1E1528]">
          <div className="max-w-lg">
            <div className="mb-2 text-[13px] font-bold tracking-widest text-[#C25478]">GROUTRIP</div>
            <h1 className="text-[38px] font-extrabold leading-tight tracking-tight text-foreground">
              친구와 함께하는<br />여행, 더 쉽게
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-muted">
              일정부터 정산까지, 그룹 여행의 모든 것을 한 곳에서 관리하세요.
            </p>

            <div className="mt-10 flex flex-col gap-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-white/70 text-[22px] shadow-sm dark:bg-white/10">
                    {f.emoji}
                  </span>
                  <div>
                    <div className="text-[15px] font-extrabold text-foreground">{f.title}</div>
                    <div className="mt-0.5 text-[13px] leading-relaxed text-muted">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 로그인 폼 */}
        <div className="flex w-[480px] shrink-0 flex-col items-center justify-center bg-background px-12 py-12">
          {loginCard}
        </div>
      </div>
    </>
  );
}
