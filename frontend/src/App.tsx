import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { reissue } from './api/auth';
import useAuthStore from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import type { User } from './types/auth';
import ProtectedRoute from './components/ProtectedRoute';

// 라우트 단위 코드 스플리팅 — 각 페이지를 별도 청크로 분리해 초기 번들을 가볍게 한다.
// 페이지 진입 시 해당 청크만 지연 로드되고, 로딩 동안 아래 RouteFallback 을 보여준다.
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const OAuthCallbackPage = lazy(() => import('./pages/auth/OAuthCallbackPage'));
const OnboardingPage = lazy(() => import('./pages/auth/OnboardingPage'));
const HomePage = lazy(() => import('./pages/home/HomePage'));
const GroupListPage = lazy(() => import('./pages/group/GroupListPage'));
const GroupCreatePage = lazy(() => import('./pages/group/GroupCreatePage'));
const GroupDetailPage = lazy(() => import('./pages/group/GroupDetailPage'));
const JoinGroupPage = lazy(() => import('./pages/group/JoinGroupPage'));
const RecapPage = lazy(() => import('./pages/group/RecapPage'));
const TripPlanPage = lazy(() => import('./pages/group/TripPlanPage'));
const ScheduleMapPage = lazy(() => import('./pages/schedule/ScheduleMapPage'));
const RecommendPage = lazy(() => import('./pages/recommend/RecommendPage'));
const RecommendLandingPage = lazy(() => import('./pages/recommend/RecommendLandingPage'));
const ChatLandingPage = lazy(() => import('./pages/chat/ChatLandingPage'));
const GroupChatRoomPage = lazy(() => import('./pages/chat/GroupChatRoomPage'));
const VoteDetailPage = lazy(() => import('./pages/vote/VoteDetailPage'));
const MyPage = lazy(() => import('./pages/mypage/MyPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/legal/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));

/** / 진입 시: 인증 여부에 따라 랜딩 또는 홈 렌더. ProtectedRoute를 거치지 않아 공개 접근 가능. */
function RootRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <HomePage /> : <LandingPage />;
}

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
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        {/* 공개 문서(인증 불필요) */}
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/" element={<RootRoute />} />

        {/* 그룹 (B 도메인 placeholder) */}
        <Route path="/groups" element={<ProtectedRoute><GroupListPage /></ProtectedRoute>} />
        <Route path="/join/:code" element={<JoinGroupPage />} />
        <Route path="/groups/new" element={<ProtectedRoute><GroupCreatePage /></ProtectedRoute>} />
        <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
        <Route path="/groups/:id/plan" element={<ProtectedRoute><TripPlanPage /></ProtectedRoute>} />
        <Route path="/groups/:id/map" element={<ProtectedRoute><ScheduleMapPage /></ProtectedRoute>} />
        <Route path="/groups/:id/recap" element={<ProtectedRoute><RecapPage /></ProtectedRoute>} />

        {/* 추천: 전역 탭은 그룹 선택 랜딩, 실제 추천은 그룹 스코프 */}
        <Route path="/recommend" element={<ProtectedRoute><RecommendLandingPage /></ProtectedRoute>} />
        <Route path="/groups/:id/recommend" element={<ProtectedRoute><RecommendPage /></ProtectedRoute>} />

        {/* 채팅: 전역 탭은 그룹(채팅방) 목록, 실제 채팅은 그룹 스코프 전체화면 */}
        <Route path="/chat" element={<ProtectedRoute><ChatLandingPage /></ProtectedRoute>} />
        <Route path="/groups/:id/chat" element={<ProtectedRoute><GroupChatRoomPage /></ProtectedRoute>} />
        <Route path="/groups/:id/votes/:voteId" element={<ProtectedRoute><VoteDetailPage /></ProtectedRoute>} />

        {/* 마이페이지 */}
        <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
