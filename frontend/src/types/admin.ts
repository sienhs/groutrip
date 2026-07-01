/** 관리자(운영자 본인) 전용 화면 타입. */

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  /** 관리자가 붙인 장난 배지/칭호(없으면 null). */
  badge: string | null;
  banned: boolean;
}
