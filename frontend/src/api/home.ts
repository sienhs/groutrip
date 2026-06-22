import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { HomeResponse } from '../types/home';

/** 홈 데이터(인사말 + 진행/예정/완료 그룹 + 알림 배지). */
export const getHome = async (): Promise<HomeResponse> => {
  const res = await instance.get<ApiResponse<HomeResponse>>('/api/home');
  return res.data.data;
};
