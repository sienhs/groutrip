import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { reissue } from './api/auth';
import useAuthStore from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import type { User } from './types/auth';
import ProtectedRoute from './components/ProtectedRoute';

// 라우트 단위 코드 스플리팅 — 각 페이지를 별도 청크로 분리해 초기 번들을 가볍게 한다.
// 페이지 진입 시 해당 청크만 지연 로드되고, 로딩 동안 아래 RouteFallback 을 보여준다.
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const OAuthCallbackPage = lazy(() => import('./pages/auth/OAuthCallbackPage'));
const HomePage = lazy(() => import('./pages/home/HomePage'));
const SurveyPage = lazy(() => import('./pages/survey/SurveyPage'));
const SurveyResultPage = lazy(() => import('./pages/survey/SurveyResultPage'));
const GroupListPage = lazy(() => import('./pages/group/GroupListPage'));
const GroupCreatePage = lazy(() => import('./pages/group/GroupCreatePage'));
const GroupDetailPage = lazy(() => import('./pages/group/GroupDetailPage'));
const JoinGroupPage = lazy(() => import('./pages/group/JoinGroupPage'));
const RecapPage = lazy(() => import('./pages/group/RecapPage'));
const TripPlanPage = lazy(() => import('./pages/group/TripPlanPage'));
const ScheduleMapPage = lazy(() => import('./pages/schedule/ScheduleMapPage'));
const RecommendPage = lazy(() => import('./pages/recommend/RecommendPage'));
const RecommendLandingPage = lazy(() => import('./pages/recommend/RecommendLandingPage'));
const VoteDetailPage = lazy(() => import('./pages/vote/VoteDetailPage'));
const MyPage = lazy(() => import('./pages/mypage/MyPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));

/** 라우트 청크 로딩 중 표시할 폴백(인증 복원 화면과 동일 톤). */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted">불러오는 중...</p>
    </div>
  );
}

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
    return <RouteFallback />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
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
        <Route path="/groups/:id/map" element={<ProtectedRoute><ScheduleMapPage /></ProtectedRoute>} />
        <Route path="/groups/:id/recap" element={<ProtectedRoute><RecapPage /></ProtectedRoute>} />

        {/* 추천: 전역 탭은 그룹 선택 랜딩, 실제 추천은 그룹 스코프 */}
        <Route path="/recommend" element={<ProtectedRoute><RecommendLandingPage /></ProtectedRoute>} />
        <Route path="/groups/:id/recommend" element={<ProtectedRoute><RecommendPage /></ProtectedRoute>} />
        <Route path="/groups/:id/votes/:voteId" element={<ProtectedRoute><VoteDetailPage /></ProtectedRoute>} />

        {/* 마이페이지 */}
        <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
