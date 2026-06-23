import instance from './instance';
import type { ApiResponse } from '../types/auth';

/**
 * 계정 API (백엔드 Part A: FR-AUTH-05/06).
 * 비번 변경/탈퇴 성공 시 refresh 쿠키 제거 → 재로그인 필요.
 * (프로필/이름 변경 엔드포인트는 Part A 에 없음 → 제공 시 추가.)
 */

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** 비밀번호 변경. */
export const changePassword = async (body: ChangePasswordRequest): Promise<void> => {
  await instance.patch<ApiResponse<unknown>>('/api/users/me/password', body);
};

/**
 * 계정 탈퇴. body 로 현재 비밀번호 필요.
 * Owner 인 그룹이 있으면 400(위임/해체 먼저).
 */
export const deleteAccount = async (password: string): Promise<void> => {
  await instance.delete<ApiResponse<unknown>>('/api/users/me', { data: { password } });
};

/** 내 프로필 사진 업로드/교체. */
export const uploadMyAvatar = async (file: File): Promise<void> => {
  const form = new FormData();
  form.append('avatar', file);
  await instance.post<ApiResponse<unknown>>('/api/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** 프로필 사진 절대 URL(공개 조회). 없으면 404 → Avatar가 이니셜로 폴백. version으로 캐시 버스트. */
export const userAvatarUrl = (userId: number, version?: number): string => {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base}/api/users/${userId}/avatar${version ? `?v=${version}` : ''}`;
};
