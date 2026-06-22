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
