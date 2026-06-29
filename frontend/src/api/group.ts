import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { TravelGroup, GroupCreateRequest, GroupUpdateRequest, GroupMember, PinnedType } from '../types/group';

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

/** FR-GROUP-04: 그룹 정보 수정(Owner). */
export const updateGroup = async (
  groupId: number,
  body: GroupUpdateRequest,
): Promise<TravelGroup> => {
  const res = await instance.patch<ApiResponse<TravelGroup>>(`/api/groups/${groupId}`, body);
  return res.data.data;
};

/** FR-GROUP-04: 커스텀 커버 이미지 업로드(Owner). coverImageKey가 CUSTOM이 된다. */
export const uploadGroupCover = async (groupId: number, file: File): Promise<TravelGroup> => {
  const form = new FormData();
  form.append('cover', file);
  // Content-Type을 수동 지정하지 않는다 — 브라우저가 multipart 경계(boundary)를 자동으로 붙여야
  // 서버가 본문을 파싱할 수 있다. 'multipart/form-data'만 지정하면 boundary가 빠져 업로드가 실패한다.
  const res = await instance.post<ApiResponse<TravelGroup>>(`/api/groups/${groupId}/cover`, form);
  return res.data.data;
};

/** 커스텀 커버 이미지 절대 URL(공개 조회). coverImageKey === 'CUSTOM'일 때 사용. */
export const groupCoverUrl = (groupId: number): string => {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base}/api/groups/${groupId}/cover`;
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

/** 채팅 허브 상단 고정 공지 설정(Owner). type: 게시판 공지글(POST) 또는 진행중 투표(VOTE). */
export const pinNotice = async (
  groupId: number,
  body: { type: PinnedType; refId: number; title: string },
): Promise<TravelGroup> => {
  const res = await instance.patch<ApiResponse<TravelGroup>>(`/api/groups/${groupId}/pin`, body);
  return res.data.data;
};

/** 상단 고정 공지 해제(Owner). */
export const clearPinnedNotice = async (groupId: number): Promise<TravelGroup> => {
  const res = await instance.delete<ApiResponse<TravelGroup>>(`/api/groups/${groupId}/pin`);
  return res.data.data;
};
