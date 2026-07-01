import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { AdminUser } from '../types/admin';

/** 운영자(본인) 전용 관리 API. 백엔드에서 관리자 이메일 계정만 허용한다. */

/** 현재 로그인 사용자가 관리자인지 여부(메뉴/라우트 노출용). */
export const getIsAdmin = (): Promise<boolean> =>
  instance.get<ApiResponse<{ admin: boolean }>>('/api/admin/me').then((r) => r.data.data.admin);

/** 전체 사용자 목록. */
export const getAdminUsers = (): Promise<AdminUser[]> =>
  instance.get<ApiResponse<AdminUser[]>>('/api/admin/users').then((r) => r.data.data);

/** 임의 사용자 닉네임 강제 변경. */
export const adminChangeName = (userId: number, name: string): Promise<AdminUser> =>
  instance
    .patch<ApiResponse<AdminUser>>(`/api/admin/users/${userId}/name`, { name })
    .then((r) => r.data.data);

/** 계정 정지/해제. */
export const adminSetBanned = (userId: number, banned: boolean): Promise<AdminUser> =>
  instance
    .patch<ApiResponse<AdminUser>>(`/api/admin/users/${userId}/ban`, { banned })
    .then((r) => r.data.data);

/** 장난 배지/칭호 설정(빈 문자열이면 제거). */
export const adminSetBadge = (userId: number, badge: string): Promise<AdminUser> =>
  instance
    .patch<ApiResponse<AdminUser>>(`/api/admin/users/${userId}/badge`, { badge })
    .then((r) => r.data.data);
