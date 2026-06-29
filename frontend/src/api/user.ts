import instance from './instance';
import type { ApiResponse } from '../types/auth';

/**
 * 계정 API (백엔드 Part A: FR-AUTH-06 / FR-MYPAGE).
 * 인증은 SNS 전용이라 비밀번호 변경은 없다. 탈퇴 성공 시 refresh 쿠키 제거 → 재로그인 필요.
 */

/** 내 여행 통계(마이페이지). */
export interface MyStats {
  inProgressTrips: number;
  upcomingTrips: number;
  completedTrips: number;
  totalTrips: number;
  totalTripDays: number;
  visitedRegions: number;
  bookmarkCount: number;
  totalSpending: number;
}

/** 표시 이름 변경. 변경된 이름을 반환한다. */
export const updateMyName = async (name: string): Promise<string> => {
  const res = await instance.patch<ApiResponse<string>>('/api/users/me', { name });
  return res.data.data;
};

/** 온보딩(동의/초기설정) 완료를 서버에 기록(계정당 1회). */
export const markOnboarded = async (): Promise<void> => {
  await instance.post<ApiResponse<null>>('/api/users/me/onboarded');
};

/** 정산 받을 링크/계좌(미설정이면 null). */
export interface Payout {
  payoutLink: string | null;
  payoutAccount: string | null;
}

/** 내 정산 링크/계좌 조회. */
export const getMyPayout = async (): Promise<Payout> => {
  const res = await instance.get<ApiResponse<Payout>>('/api/users/me/payout');
  return res.data.data;
};

/** 내 정산 링크/계좌 저장(빈 값은 미설정). 저장된 값을 반환한다. */
export const updateMyPayout = async (body: Payout): Promise<Payout> => {
  const res = await instance.patch<ApiResponse<Payout>>('/api/users/me/payout', body);
  return res.data.data;
};

/** 내 여행 통계 조회. */
export const getMyStats = async (): Promise<MyStats> => {
  const res = await instance.get<ApiResponse<MyStats>>('/api/mypage/stats');
  return res.data.data;
};

/**
 * 계정 탈퇴(SNS 전용이라 비밀번호 재확인 없음 — 확인은 클라이언트에서 처리).
 * Owner 인 그룹이 있으면 400(위임/해체 먼저).
 */
export const deleteAccount = async (): Promise<void> => {
  await instance.delete<ApiResponse<unknown>>('/api/users/me');
};

/** 내 프로필 사진 업로드/교체. */
export const uploadMyAvatar = async (file: File): Promise<void> => {
  const form = new FormData();
  form.append('avatar', file);
  // Content-Type을 수동 지정하지 않는다 — 브라우저가 multipart boundary를 자동으로 붙여야 서버가 파싱한다.
  await instance.post<ApiResponse<unknown>>('/api/users/me/avatar', form);
};

/** 프로필 사진 절대 URL(공개 조회). 없으면 404 → Avatar가 이니셜로 폴백. version으로 캐시 버스트. */
export const userAvatarUrl = (userId: number, version?: number): string => {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base}/api/users/${userId}/avatar${version ? `?v=${version}` : ''}`;
};
