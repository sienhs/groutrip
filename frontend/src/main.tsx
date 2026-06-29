import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ToastProvider from './components/Toast'
import './index.css'
import App from './App.tsx'
// 부팅 시점에 beforeinstallprompt를 가로채려면 일찍 import 해야 한다.
import './lib/pwa'

// React Query 전역 기본값.
// - staleTime 30s: 같은 데이터로 재마운트되는 화면 전환 시 중복 네트워크 요청을 막는다.
// - refetchOnWindowFocus off: 모바일에서 앱 포커스가 자주 바뀌어 불필요한 재요청이 잦다.
// - retry 1: 일시적 네트워크 오류만 1회 재시도(영구 오류는 빠르게 표면화).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)

// PWA 서비스 워커 등록(프로덕션만 — 개발 중 HMR 간섭 방지).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
