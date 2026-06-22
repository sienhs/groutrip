export type GroupStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELETED';
export type GroupRole = 'OWNER' | 'MEMBER';

export interface GroupRequest {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImageKey: string | null;
}

export interface GroupResponse extends GroupRequest {
  id: number;
  inviteCode: string;
  status: GroupStatus;
}

export interface GroupMemberResponse {
  memberId: number;
  userId: number;
  name: string;
  role: GroupRole;
  joinedAt: string;
}
