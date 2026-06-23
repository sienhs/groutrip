import instance from './instance';
import type { ApiResponse, LoginRequest, LoginResponse, SignupRequest } from '../types/auth';

export const login = async (request: LoginRequest): Promise<LoginResponse> => {
  const response = await instance.post<ApiResponse<LoginResponse>>('/api/auth/login', request);
  return response.data.data;
};

export const signup = async (request: SignupRequest): Promise<void> => {
  await instance.post<ApiResponse<null>>('/api/auth/signup', request);
};

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
