import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { login, reissue } from './api/auth';
import useAuthStore from './store/authStore';
import type { User } from './types/auth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import HomePage from './pages/home/HomePage';
import SurveyPage from './pages/survey/SurveyPage';
import SurveyResultPage from './pages/survey/SurveyResultPage';
import GroupListPage from './pages/group/GroupListPage';
import GroupCreatePage from './pages/group/GroupCreatePage';
import GroupDetailPage from './pages/group/GroupDetailPage';
import RecommendPage from './pages/recommend/RecommendPage';
import VoteDetailPage from './pages/vote/VoteDetailPage';
import MyPage from './pages/mypage/MyPage';

function App() {
  const [isRestoring, setIsRestoring] = useState(true);
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const accessToken = await reissue();
        const saved = localStorage.getItem('auth_user');
        if (saved) {
          setAuth(accessToken, JSON.parse(saved) as User);
        } else {
          clearAuth();
        }
      } catch {
        // 개발용 임시 우회: 옛 로그인 페이지(선생님의 서랍)를 거치지 않고
        // 테스트 계정으로 자동 로그인해 바로 홈으로 진입한다. (로그인 페이지 재작업 시 제거)
        try {
          const res = await login({ email: 'test@test.com', password: 'test1234' });
          setAuth(res.accessToken, { name: res.name, email: res.email });
        } catch {
          clearAuth();
        }
      } finally {
        setIsRestoring(false);
      }
    };

    restoreAuth();
  }, [setAuth, clearAuth]);

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted">불러오는 중...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/survey" element={<ProtectedRoute><SurveyPage /></ProtectedRoute>} />
        <Route path="/survey/result" element={<ProtectedRoute><SurveyResultPage /></ProtectedRoute>} />

        {/* 그룹 (B 도메인 placeholder) */}
        <Route path="/groups" element={<ProtectedRoute><GroupListPage /></ProtectedRoute>} />
        <Route path="/groups/new" element={<ProtectedRoute><GroupCreatePage /></ProtectedRoute>} />
        <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />

        {/* 추천 · 투표 상세 (그룹 스코프) */}
        <Route path="/groups/:id/recommend" element={<ProtectedRoute><RecommendPage /></ProtectedRoute>} />
        <Route path="/groups/:id/votes/:voteId" element={<ProtectedRoute><VoteDetailPage /></ProtectedRoute>} />

        {/* 마이페이지 */}
        <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
