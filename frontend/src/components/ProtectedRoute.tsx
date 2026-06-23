import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // 로그인 후 원래 가려던 경로로 복귀(초대 링크 등). OAuth 리다이렉트 동안 유지되도록 sessionStorage 사용.
    const target = location.pathname + location.search;
    if (target !== '/' && target !== '/login') {
      sessionStorage.setItem('post_login_redirect', target);
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
