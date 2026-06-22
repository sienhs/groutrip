import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { GroupMemberResponse, GroupRequest, GroupResponse } from '../types/group';

export const createGroup = async (request: GroupRequest): Promise<GroupResponse> => {
  const response = await instance.post<ApiResponse<GroupResponse>>('/api/groups', request);
  return response.data.data;
};

export const getMyGroups = async (): Promise<GroupResponse[]> => {
  const response = await instance.get<ApiResponse<GroupResponse[]>>('/api/groups');
  return response.data.data;
};

export const joinGroup = async (inviteCode: string): Promise<GroupResponse> => {
  const response = await instance.post<ApiResponse<GroupResponse>>(
    `/api/groups/join/${encodeURIComponent(inviteCode)}`,
  );
  return response.data.data;
};

export const getGroup = async (groupId: number): Promise<GroupResponse> => {
  const response = await instance.get<ApiResponse<GroupResponse>>(`/api/groups/${groupId}`);
  return response.data.data;
};

export const updateGroup = async (
  groupId: number,
  request: GroupRequest,
): Promise<GroupResponse> => {
  const response = await instance.patch<ApiResponse<GroupResponse>>(`/api/groups/${groupId}`, request);
  return response.data.data;
};

export const getGroupMembers = async (groupId: number): Promise<GroupMemberResponse[]> => {
  const response = await instance.get<ApiResponse<GroupMemberResponse[]>>(
    `/api/groups/${groupId}/members`,
  );
  return response.data.data;
};

export const leaveGroup = async (groupId: number): Promise<void> => {
  await instance.delete(`/api/groups/${groupId}/members/me`);
};

export const kickGroupMember = async (groupId: number, userId: number): Promise<void> => {
  await instance.delete(`/api/groups/${groupId}/members/${userId}`);
};

export const transferGroupOwner = async (groupId: number, userId: number): Promise<void> => {
  await instance.patch(`/api/groups/${groupId}/owner/${userId}`);
};

export const dissolveGroup = async (groupId: number): Promise<void> => {
  await instance.delete(`/api/groups/${groupId}`);
};

export const regenerateInviteCode = async (groupId: number): Promise<GroupResponse> => {
  const response = await instance.patch<ApiResponse<GroupResponse>>(
    `/api/groups/${groupId}/invite-code`,
  );
  return response.data.data;
};
