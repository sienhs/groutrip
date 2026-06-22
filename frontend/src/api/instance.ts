import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // HttpOnly Cookie (Refresh Token) 자동 전송
});

instance.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequest;
    // reissue 호출 자체의 401은 "세션 없음"이므로 재발급/리다이렉트 대상이 아니다(무한 루프 방지).
    const isReissueCall = originalRequest?.url?.includes('/api/auth/reissue') ?? false;

    if (error.response?.status === 401 && !originalRequest._retry && !isReissueCall) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post<{ success: boolean; message: string; data: string }>(
          `${import.meta.env.VITE_API_BASE_URL}/api/auth/reissue`,
          {},
          { withCredentials: true }
        );

        setAccessToken(data.data);
        originalRequest.headers.Authorization = `Bearer ${data.data}`;
        return instance(originalRequest);
      } catch {
        setAccessToken(null);
        // 이미 로그인 화면이면 리다이렉트하지 않는다(새로고침 루프 방지).
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default instance;
