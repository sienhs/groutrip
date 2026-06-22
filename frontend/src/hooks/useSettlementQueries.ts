import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmSettlementReceived,
  confirmSettlementSent,
  getSettlementPaymentLinks,
  getSettlementProgress,
  getSettlementSummary,
  startSettlement,
} from '../api/settlement';
import { queryKeys } from '../lib/queryKeys';
import type { SettlementProgressResponse } from '../types/settlement';

export function useSettlementSummaryQuery(groupId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.settlements.summary(groupId),
    queryFn: () => getSettlementSummary(groupId),
    enabled,
  });
}

export function useSettlementProgressQuery(groupId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.settlements.progress(groupId),
    queryFn: () => getSettlementProgress(groupId),
    enabled,
  });
}

export function useSettlementPaymentLinksQuery(
  groupId: number,
  settlementId: number,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.settlements.paymentLinks(groupId, settlementId),
    queryFn: () => getSettlementPaymentLinks(groupId, settlementId),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

function useCacheSettlementProgress(groupId: number) {
  const queryClient = useQueryClient();

  return (progress: SettlementProgressResponse) => {
    // 사용자 확인 결과를 즉시 반영하되, 잔액·송금 계산 요약은 서버 결과를 다시 확인한다.
    queryClient.setQueryData(queryKeys.settlements.progress(groupId), progress);
    void queryClient.invalidateQueries({ queryKey: queryKeys.settlements.summary(groupId) });
  };
}

export function useStartSettlementMutation(groupId: number) {
  const cacheSettlementProgress = useCacheSettlementProgress(groupId);

  return useMutation({
    mutationFn: () => startSettlement(groupId),
    onSuccess: cacheSettlementProgress,
  });
}

export function useConfirmSettlementSentMutation(groupId: number) {
  const cacheSettlementProgress = useCacheSettlementProgress(groupId);

  return useMutation({
    mutationFn: (settlementId: number) => confirmSettlementSent(groupId, settlementId),
    onSuccess: cacheSettlementProgress,
  });
}

export function useConfirmSettlementReceivedMutation(groupId: number) {
  const cacheSettlementProgress = useCacheSettlementProgress(groupId);

  return useMutation({
    mutationFn: (settlementId: number) => confirmSettlementReceived(groupId, settlementId),
    onSuccess: cacheSettlementProgress,
  });
}
