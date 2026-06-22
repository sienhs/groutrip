/**
 * ⚠️ PLACEHOLDER — 그룹(B 도메인) 백엔드 DTO 미확정.
 * 브리프 8-3 의 "알려진 사실"에 맞춰 임시 정의. 백엔드 DTO 확정 시 필드/이름 교체.
 *  - 엔티티명 TravelGroup(예약어 회피)
 *  - 소유자는 GroupMember.role === 'OWNER' (그룹에 owner 필드 없음)
 *  - 멤버 탈퇴는 soft delete(leftAt), 활성 여부는 isActiveMember()
 */

export type GroupRole = 'OWNER' | 'MEMBER';

/** 여행 기간 기준 파생 상태(프론트 계산 or BE 제공). */
export type GroupStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

/** 커버 프리셋 8종. */
export type CoverPreset =
  | 'SUNSET'
  | 'OCEAN'
  | 'FOREST'
  | 'NIGHT'
  | 'SAKURA'
  | 'TROPICAL'
  | 'LAVENDER'
  | 'EARTH';

export interface GroupMember {
  userId: number;
  name: string;
  role: GroupRole;
  joinedAt: string; // ISO
  /** soft delete 시각. null 이면 활성 멤버. */
  leftAt: string | null;
}

export interface TravelGroup {
  id: number;
  name: string;
  /** ISO date (YYYY-MM-DD) */
  startDate: string;
  endDate: string;
  /** 커버 키(프리셋 키 SUNSET 등 또는 이미지 키). */
  coverImageKey: string;
  /** 활성 멤버 수 (BE 제공 가정). */
  memberCount: number;
  /** 목록 응답엔 없을 수 있음(상세에서 제공). */
  members?: GroupMember[];
  /** 초대 코드(상세/생성 응답). */
  inviteCode?: string;
}

export interface GroupCreateRequest {
  name: string;
  startDate: string;
  endDate: string;
  /** 커버 프리셋 키 */
  coverImageKey: string;
}

/** 활성 멤버 여부(leftAt 으로 판정). */
export const isActiveMember = (m: GroupMember): boolean => m.leftAt == null;

/** OWNER 찾기(그룹에 owner 필드가 없으므로 멤버 role 로). */
export const findOwner = (members: GroupMember[] = []): GroupMember | undefined =>
  members.find((m) => m.role === 'OWNER' && isActiveMember(m));
