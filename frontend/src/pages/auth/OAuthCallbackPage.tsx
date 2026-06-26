import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeOAuthCode } from '../../api/auth';
import { getMyPreference } from '../../api/survey';
import useAuthStore from '../../store/authStore';
import { Card } from '../../components';
import AuthBrand from './AuthBrand';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const hasCallbackError = !code || searchParams.has('error');
  const [error, setError] = useState(
    hasCallbackError ? '소셜 로그인에 실패했습니다. 다시 시도해주세요.' : '',
  );
  const startedRef = useRef(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!code || hasCallbackError) return;

    const completeLogin = async () => {
      try {
        const response = await exchangeOAuthCode(code);
        setAuth(response.accessToken, {
          id: response.userId,
          name: response.name,
          email: response.email,
        });
        // 초대 링크 등으로 진입했다면 원래 경로로 복귀(설문 분기보다 우선).
        const redirect = sessionStorage.getItem('post_login_redirect');
        if (redirect) {
          sessionStorage.removeItem('post_login_redirect');
          navigate(redirect, { replace: true });
          return;
        }
        try {
          await getMyPreference();
          navigate('/', { replace: true });
        } catch {
          navigate('/survey', { replace: true });
        }
      } catch {
        setError('인증 정보가 만료되었습니다. 소셜 로그인을 다시 시도해주세요.');
      }
    };

    void completeLogin();
  }, [code, hasCallbackError, navigate, setAuth]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-background px-6 py-10">
      <AuthBrand subtitle="소셜 계정으로 로그인하는 중" />
      <Card padding="lg">
        {error ? (
          <div className="text-center">
            <p role="alert" className="mb-4 text-sm text-danger">{error}</p>
            <Link to="/login" className="font-bold text-[#C25478] hover:underline">
              로그인 화면으로 돌아가기
            </Link>
          </div>
        ) : (
          <p className="text-center text-sm text-muted">안전하게 로그인 정보를 확인하고 있습니다...</p>
        )}
      </Card>
    </div>
  );
}
