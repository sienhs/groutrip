import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGroup,
  dissolveGroup,
  getGroup,
  getGroupMembers,
  getMyGroups,
  joinGroup,
  kickGroupMember,
  leaveGroup,
  regenerateInviteCode,
  transferGroupOwner,
  updateGroup,
} from '../api/group';
import { queryKeys } from '../lib/queryKeys';
import type { GroupRequest } from '../types/group';

export function useMyGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.groups.list(),
    queryFn: getMyGroups,
  });
}

export function useGroupQuery(groupId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: () => getGroup(groupId),
    enabled,
  });
}

export function useGroupMembersQuery(groupId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId),
    queryFn: () => getGroupMembers(groupId),
    enabled,
  });
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroup,
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.groups.detail(group.id), group);
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
    },
  });
}

export function useJoinGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinGroup,
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.groups.detail(group.id), group);
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
    },
  });
}

export function useUpdateGroupMutation(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: GroupRequest) => updateGroup(groupId, request),
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.groups.detail(groupId), group);
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
    },
  });
}

export function useRegenerateInviteCodeMutation(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => regenerateInviteCode(groupId),
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.groups.detail(groupId), group);
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
    },
  });
}

export function useLeaveGroupMutation(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: () => {
      // 탈퇴한 그룹의 권한 없는 상세 데이터가 메모리에 남지 않도록 그룹 범위 캐시를 제거한다.
      queryClient.removeQueries({ queryKey: queryKeys.groups.detail(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
    },
  });
}

export function useDissolveGroupMutation(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => dissolveGroup(groupId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.groups.detail(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
    },
  });
}

export function useKickGroupMemberMutation(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => kickGroupMember(groupId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
    },
  });
}

export function useTransferGroupOwnerMutation(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => transferGroupOwner(groupId, userId),
    onSuccess: () => {
      // Owner 이전은 현재 사용자와 대상 사용자의 역할을 함께 바꾸므로 멤버 목록 전체를 갱신한다.
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
    },
  });
}
