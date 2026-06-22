# 공통 컴포넌트 드롭인 — 적용 안내

브리프 1·6번 기준. 모두 React 19 함수형 + TS + Tailwind v4 유틸리티만 사용(인라인 style 없음).

## 1) 추가/수정 파일

```
src/index.css                  ← @theme 토큰 + Pretendard (덮어쓰기)
src/lib/cn.ts                  ← 클래스 합치기 유틸
src/components/Button.tsx
src/components/Input.tsx
src/components/Select.tsx
src/components/MultiSelect.tsx
src/components/Modal.tsx        ← Modal + ConfirmModal
src/components/Toast.tsx        ← ToastProvider + useToast
src/components/Card.tsx
src/components/Badge.tsx
src/components/Avatar.tsx       ← Avatar + AvatarGroup
src/components/Skeleton.tsx     ← Skeleton + SkeletonCard
src/components/EmptyState.tsx
src/components/Tabs.tsx
src/components/Header.tsx
src/components/BottomNav.tsx
src/components/AppLayout.tsx
src/components/index.ts         ← 배럴
```

## 2) index.html — Pretendard CDN 추가 (`<head>` 안)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" />
```

## 3) main.tsx — 전역 Provider 래핑 (네 실제 main.tsx 기준)

> `BrowserRouter` 는 이미 `App.tsx` 안에 있으므로 main 에선 Provider만 감싼다.
> React Query 까지 한 번에 적용한 최종형:

```diff
 import { StrictMode } from 'react'
 import { createRoot } from 'react-dom/client'
+import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
+import ToastProvider from './components/Toast'
 import './index.css'
 import App from './App.tsx'

+const queryClient = new QueryClient()
 createRoot(document.getElementById('root')!).render(
   <StrictMode>
-    <App />
+    <QueryClientProvider client={queryClient}>
+      <ToastProvider>
+        <App />
+      </ToastProvider>
+    </QueryClientProvider>
   </StrictMode>,
 )
```

## 4) 사용 예

```tsx
import { Button, Input, useToast, ConfirmModal, AppLayout } from './components';

function Example() {
  const toast = useToast();
  return (
    <AppLayout title="설정">
      <Input label="이메일" type="email" placeholder="you@example.com" />
      <Button onClick={() => toast.success('저장되었습니다')}>저장</Button>
    </AppLayout>
  );
}
```

- 토큰 유틸: `bg-primary` `text-primary` `bg-background` `bg-surface` `border-border` `text-muted` `rounded-card` `rounded-button`.
- 아바타 색상은 정적 `bg-[#...]` 클래스로 나열 → Tailwind JIT 가 인식(인라인 style 미사용).

## 5) 추가 필요 패키지 (설치 후 SSE/React Query 동작)

브리프 8-1에서 **React Query 도입 확정** → 패턴은 코드에 반영했고, 패키지만 설치하면 동작합니다.

```bash
npm i @tanstack/react-query event-source-polyfill
npm i -D @types/event-source-polyfill
```

- `@tanstack/react-query` — 데이터 페칭/캐시. SSE 수신 시 `queryClient.invalidateQueries([domain, groupId])` 로 갱신.
- `event-source-polyfill` — SSE 에 Authorization 헤더 주입 (`GET /api/groups/{id}/stream`).

설치 전까지 `hooks/useGroupStream.ts` 의 두 import 가 미해결입니다(그 외 화면은 영향 없음).

## 6) SSE 실시간 알림 (브리프 7)

추가 파일:
```
src/types/sse.ts                 ← GroupEventType(14종) · GroupEvent · EVENT_META(토스트 문구/도메인)
src/store/notificationStore.ts   ← Zustand 알림 스토어(unread/add/markAllRead)
src/hooks/useGroupStream.ts      ← SSE 구독 훅
src/components/NotificationBell.tsx ← 벨 + 드롭다운(unread 배지)
```

동작 요약 (`useGroupStream`):
- `GET /api/groups/{id}/stream` 를 `EventSourcePolyfill`(Authorization 헤더)로 구독, `heartbeatTimeout` 45초
- **3회 연속 실패 → 5초 폴링 폴백**(모든 도메인 `invalidateQueries`), 재연결 성공 시 폴링 중단
- **본인(actorId === currentUserId) 이벤트 무시** (토스트는 생략, 캐시만 갱신)
- 타 멤버 이벤트 → `"{이름}님이 …했습니다"` 토스트 + 알림 스토어 push + 해당 도메인 캐시 무효화
- 그룹 허브(`GroupDetailPage`)에서 그룹 로드 후 자동 구독, 헤더에 `NotificationBell`

> main.tsx 래핑은 **3절** 참고(QueryClientProvider + ToastProvider). 토큰은 `instance.ts` 의 `getAccessToken()` 사용(이미 반영).

> ⚠️ 조정 지점 1곳: `GroupDetailPage` 의 `currentUserId` 는 `user.id` 를 가정하지만 현재 `types/auth.ts` `User` 에는 `name/email` 뿐 → 백엔드가 `LoginResponse/User` 에 `userId` 를 노출하면 그 필드로 교체(그전엔 본인 이벤트 무시가 비활성, 토스트가 자기 행동에도 뜰 수 있음).

## 7) App.tsx — 신규 라우트 추가 (네 실제 App.tsx 기준)

`<BrowserRouter>` 는 이미 `App.tsx` 안에 있음. import 와 `<Route>` 만 추가:

```diff
 import HomePage from './pages/home/HomePage';
 import SurveyPage from './pages/survey/SurveyPage';
 import SurveyResultPage from './pages/survey/SurveyResultPage';
+import GroupListPage from './pages/group/GroupListPage';
+import GroupCreatePage from './pages/group/GroupCreatePage';
+import GroupDetailPage from './pages/group/GroupDetailPage';
+import RecommendPage from './pages/recommend/RecommendPage';
+import VoteDetailPage from './pages/vote/VoteDetailPage';
+import MyPage from './pages/mypage/MyPage';
```
```diff
         <Route path="/survey/result" element={<ProtectedRoute><SurveyResultPage /></ProtectedRoute>} />
+        <Route path="/groups" element={<ProtectedRoute><GroupListPage /></ProtectedRoute>} />
+        <Route path="/groups/new" element={<ProtectedRoute><GroupCreatePage /></ProtectedRoute>} />
+        <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
+        <Route path="/groups/:id/recommend" element={<ProtectedRoute><RecommendPage /></ProtectedRoute>} />
+        <Route path="/groups/:id/votes/:voteId" element={<ProtectedRoute><VoteDetailPage /></ProtectedRoute>} />
+        <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
```
> 정산·일정은 `GroupDetailPage` 탭에 임베드 → 별도 라우트 불필요.
> `HomePage`/`SurveyPage`/`SurveyResultPage` 는 기존 파일을 **이 드롭인 버전이 대체**(보강). 기존 동작 확인 후 머지.

## 8) 적용 위치
- 이 `src/` 는 repo 의 `frontend/src/` 에 병합(상대 import 그대로 맞음).
- `index.css` 는 기존 `@import "tailwindcss";` 한 줄을 **이 파일이 대체**(토큰 @theme 추가).
