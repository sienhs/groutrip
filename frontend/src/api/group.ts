import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { TravelGroup, GroupCreateRequest, GroupMember } from '../types/group';

/** 내 그룹 목록. */
export const getMyGroups = async (): Promise<TravelGroup[]> => {
  const res = await instance.get<ApiResponse<TravelGroup[]>>('/api/groups');
  return res.data.data;
};

/** 그룹 상세. */
export const getGroup = async (groupId: number): Promise<TravelGroup> => {
  const res = await instance.get<ApiResponse<TravelGroup>>(`/api/groups/${groupId}`);
  return res.data.data;
};

/** 그룹 활성 멤버 목록. */
export const getGroupMembers = async (groupId: number): Promise<GroupMember[]> => {
  const res = await instance.get<ApiResponse<GroupMember[]>>(`/api/groups/${groupId}/members`);
  return res.data.data;
};

/** 그룹 생성. */
export const createGroup = async (body: GroupCreateRequest): Promise<TravelGroup> => {
  const res = await instance.post<ApiResponse<TravelGroup>>('/api/groups', body);
  return res.data.data;
};

/** 초대 코드로 참여. */
export const joinGroup = async (inviteCode: string): Promise<TravelGroup> => {
  const res = await instance.post<ApiResponse<TravelGroup>>(`/api/groups/join/${inviteCode}`);
  return res.data.data;
};

/** FR-GROUP-05: 그룹 나가기(일반 멤버). Owner는 위임/해체 후에만 가능. */
export const leaveGroup = async (groupId: number): Promise<void> => {
  await instance.delete<ApiResponse<null>>(`/api/groups/${groupId}/members/me`);
};

/** FR-GROUP-05: 멤버 강퇴(Owner). */
export const kickMember = async (groupId: number, targetUserId: number): Promise<void> => {
  await instance.delete<ApiResponse<null>>(`/api/groups/${groupId}/members/${targetUserId}`);
};

/** FR-GROUP-05: Owner 권한 이전(Owner → 대상 멤버). */
export const transferOwner = async (groupId: number, targetUserId: number): Promise<void> => {
  await instance.patch<ApiResponse<null>>(`/api/groups/${groupId}/owner/${targetUserId}`);
};

/** FR-GROUP-06: 그룹 해체(Owner). */
export const dissolveGroup = async (groupId: number): Promise<void> => {
  await instance.delete<ApiResponse<null>>(`/api/groups/${groupId}`);
};

/** FR-GROUP-07: 초대 코드 재발급(Owner). 기존 코드는 즉시 무효화. */
export const regenerateInviteCode = async (groupId: number): Promise<TravelGroup> => {
  const res = await instance.patch<ApiResponse<TravelGroup>>(`/api/groups/${groupId}/invite-code`);
  return res.data.data;
};
