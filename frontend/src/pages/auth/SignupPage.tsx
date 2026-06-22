import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { signup } from '../../api/auth';
import type { ApiResponse } from '../../types/auth';
import { Button, Card, Input } from '../../components';
import AuthBrand, { PasswordToggle } from './AuthBrand';

/**
 * FR-AUTH-01 회원가입. 모바일 우선 + 디자인 시스템.
 * 가입 성공 시 자동 로그인 없이 로그인 페이지로 이동(요구사항).
 */
export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signup({ email, password, name });
      navigate('/login', { state: { signedUp: true } });
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse<null>>;
      setError(axiosError.response?.data?.message ?? '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-background px-6 py-10">
      <AuthBrand subtitle="함께 시작해요" />

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="이름"
            type="text"
            autoComplete="name"
            placeholder="여행에 표시될 이름"
            helper="2~20자의 한글, 영문, 숫자"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
            autoComplete="new-password"
            placeholder="비밀번호를 입력해주세요"
            helper="영문, 숫자, 특수문자를 포함한 8자 이상"
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
            회원가입
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-muted">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-bold text-[#E8742E] hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
