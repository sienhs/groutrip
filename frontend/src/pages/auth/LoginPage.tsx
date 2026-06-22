import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { login } from '../../api/auth';
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
      setAuth(res.accessToken, { name: res.name, email: res.email });
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
