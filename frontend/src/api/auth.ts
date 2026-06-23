import instance from './instance';
import type { ApiResponse, LoginResponse } from '../types/auth';

export const logout = async (): Promise<void> => {
  await instance.post<ApiResponse<null>>('/api/auth/logout');
};

export const reissue = async (): Promise<string> => {
  const response = await instance.post<ApiResponse<string>>('/api/auth/reissue');
  return response.data.data;
};

export const exchangeOAuthCode = async (code: string): Promise<LoginResponse> => {
  const response = await instance.post<ApiResponse<LoginResponse>>('/api/auth/oauth/exchange', { code });
  return response.data.data;
};

export const getOAuthAuthorizationUrl = (provider: 'google' | 'kakao'): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
  return `${baseUrl}/oauth2/authorization/${provider}`;
};
