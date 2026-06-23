import { getOAuthAuthorizationUrl } from '../../api/auth';
import { Card } from '../../components';
import AuthBrand from './AuthBrand';

/**
 * 로그인 — SNS(카카오/구글) 전용. 이메일/비밀번호 로그인·회원가입은 제공하지 않는다.
 * 소셜 로그인 성공 후 처리(성향 설문 분기 등)는 /oauth/callback(OAuthCallbackPage)에서 한다.
 */
export default function LoginPage() {
  const handleOAuthLogin = (provider: 'google' | 'kakao') => {
    window.location.assign(getOAuthAuthorizationUrl(provider));
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-background px-6 py-10">
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
    </div>
  );
}
