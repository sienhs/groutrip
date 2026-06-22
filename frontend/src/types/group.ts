/**
 * 그룹(FR-GROUP) 타입 — Part B 백엔드 계약에 맞춤.
 *  - GroupResponse: id/title/destination/startDate/endDate/coverImageKey/inviteCode/status
 *  - 멤버는 GET /api/groups/{id}/members (GroupMemberResponse)로 별도 조회(활성 멤버만)
 *  - 소유자는 GroupMember.role === 'OWNER'
 */

export type GroupRole = 'OWNER' | 'MEMBER';

/** 백엔드 GroupStatus(날짜 기준). */
export type GroupStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELETED';

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

/** GroupMemberResponse (활성 멤버). */
export interface GroupMember {
  memberId: number;
  userId: number;
  name: string;
  role: GroupRole;
  joinedAt: string; // ISO
}

/** GroupResponse. */
export interface TravelGroup {
  id: number;
  title: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  coverImageKey: string;
  inviteCode: string;
  status: GroupStatus;
}

/** GroupCreateRequest. */
export interface GroupCreateRequest {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImageKey: string;
}

/** OWNER 찾기(그룹에 owner 필드가 없으므로 멤버 role 로). */
export const findOwner = (members: GroupMember[] = []): GroupMember | undefined =>
  members.find((m) => m.role === 'OWNER');
