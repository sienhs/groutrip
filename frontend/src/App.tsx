import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { reissue } from './api/auth';
import useAuthStore from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import type { User } from './types/auth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import HomePage from './pages/home/HomePage';
import SurveyPage from './pages/survey/SurveyPage';
import SurveyResultPage from './pages/survey/SurveyResultPage';
import GroupListPage from './pages/group/GroupListPage';
import GroupCreatePage from './pages/group/GroupCreatePage';
import GroupDetailPage from './pages/group/GroupDetailPage';
import JoinGroupPage from './pages/group/JoinGroupPage';
import RecapPage from './pages/group/RecapPage';
import TripPlanPage from './pages/group/TripPlanPage';
import RecommendPage from './pages/recommend/RecommendPage';
import RecommendLandingPage from './pages/recommend/RecommendLandingPage';
import VoteDetailPage from './pages/vote/VoteDetailPage';
import MyPage from './pages/mypage/MyPage';
import NotificationsPage from './pages/notifications/NotificationsPage';

function App() {
  const [isRestoring, setIsRestoring] = useState(true);
  const { setAuth, clearAuth } = useAuthStore();
  const theme = useSettingsStore((s) => s.theme);

  // 개인설정 테마를 <html>.dark 클래스로 반영(기기 단위, localStorage).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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
        clearAuth();
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
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/survey" element={<ProtectedRoute><SurveyPage /></ProtectedRoute>} />
        <Route path="/survey/result" element={<ProtectedRoute><SurveyResultPage /></ProtectedRoute>} />

        {/* 그룹 (B 도메인 placeholder) */}
        <Route path="/groups" element={<ProtectedRoute><GroupListPage /></ProtectedRoute>} />
        <Route path="/join/:code" element={<ProtectedRoute><JoinGroupPage /></ProtectedRoute>} />
        <Route path="/groups/new" element={<ProtectedRoute><GroupCreatePage /></ProtectedRoute>} />
        <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
        <Route path="/groups/:id/plan" element={<ProtectedRoute><TripPlanPage /></ProtectedRoute>} />
        <Route path="/groups/:id/recap" element={<ProtectedRoute><RecapPage /></ProtectedRoute>} />

        {/* 추천: 전역 탭은 그룹 선택 랜딩, 실제 추천은 그룹 스코프 */}
        <Route path="/recommend" element={<ProtectedRoute><RecommendLandingPage /></ProtectedRoute>} />
        <Route path="/groups/:id/recommend" element={<ProtectedRoute><RecommendPage /></ProtectedRoute>} />
        <Route path="/groups/:id/votes/:voteId" element={<ProtectedRoute><VoteDetailPage /></ProtectedRoute>} />

        {/* 마이페이지 */}
        <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
