import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { TravelGroup, GroupCreateRequest } from '../types/group';

/**
 * ⚠️ PLACEHOLDER API — 그룹(B 도메인) 백엔드 미확정.
 * 경로/응답 형태는 팀원 B 의 컨트롤러 확정 시 교체. 패턴(instance + ApiResponse 언래핑)은 유지.
 */

/** 내 그룹 목록. */
export const getMyGroups = async (): Promise<TravelGroup[]> => {
  const res = await instance.get<ApiResponse<TravelGroup[]>>('/api/groups');
  return res.data.data;
};

/** 그룹 상세(멤버 포함). */
export const getGroup = async (groupId: number): Promise<TravelGroup> => {
  const res = await instance.get<ApiResponse<TravelGroup>>(`/api/groups/${groupId}`);
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
