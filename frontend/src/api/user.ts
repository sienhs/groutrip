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
