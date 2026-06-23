import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { getOAuthAuthorizationUrl, login } from '../../api/auth';
import { getMyPreference } from '../../api/survey';
import useAuthStore from '../../store/authStore';
import type { ApiResponse } from '../../types/auth';
import { Button, Card, Input } from '../../components';
import AuthBrand, { PasswordToggle } from './AuthBrand';

/**
 * FR-AUTH-02 로그인. 모바일 우선(max-w-md 중앙 정렬) + 디자인 시스템.
 * 로그인 성공 후 성향 정보가 없으면 설문(/survey)으로, 있으면 홈(/)으로 이동.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const signedUp = (location.state as { signedUp?: boolean } | null)?.signedUp ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await login({ email, password });
      setAuth(res.accessToken, { id: res.userId, name: res.name, email: res.email });
      try {
        await getMyPreference();
        navigate('/');
      } catch {
        navigate('/survey'); // 성향 정보 없음 → 설문으로 유도
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse<null>>;
      setError(axiosError.response?.data?.message ?? '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'kakao') => {
    window.location.assign(getOAuthAuthorizationUrl(provider));
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-background px-6 py-10">
      <AuthBrand subtitle="함께 만드는 우리의 여행" />

      {signedUp && (
        <p className="mb-3 rounded-button bg-[#F0FDF4] px-3 py-2 text-center text-[13px] text-success">
          회원가입이 완료되었습니다. 로그인해주세요.
        </p>
      )}

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="이메일"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="비밀번호"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="비밀번호를 입력해주세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            trailing={<PasswordToggle shown={showPw} onToggle={() => setShowPw((v) => !v)} />}
          />

          {error && (
            <p role="alert" className="rounded-button bg-[#FFF5F5] px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading} className="mt-1">
            로그인
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">또는</span>
          <span className="h-px flex-1 bg-border" />
        </div>

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

      <p className="mt-6 text-center text-sm text-muted">
        아직 계정이 없으신가요?{' '}
        <Link to="/signup" className="font-bold text-[#E8742E] hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
