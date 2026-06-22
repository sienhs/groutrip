import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { SettlementProgress, PaymentLinks } from '../types/settlement';

const base = (groupId: number) => `/api/groups/${groupId}/settlements`;

/** 정산 진행 상태 조회. 시작 전이면 404(미시작) → 호출부에서 처리. */
export const getSettlementProgress = async (groupId: number): Promise<SettlementProgress> => {
  const res = await instance.get<ApiResponse<SettlementProgress>>(`${base(groupId)}/progress`);
  return res.data.data;
};

/** 정산 시작(현재 최소 송금 계산을 PENDING 송금으로 확정, FR-EXPENSE-06). */
export const startSettlement = async (groupId: number): Promise<SettlementProgress> => {
  const res = await instance.post<ApiResponse<SettlementProgress>>(base(groupId));
  return res.data.data;
};

/** 본인 PENDING 송금의 Toss/KakaoPay 딥링크(FR-EXPENSE-05). */
export const getPaymentLinks = async (groupId: number, settlementId: number): Promise<PaymentLinks> => {
  const res = await instance.get<ApiResponse<PaymentLinks>>(`${base(groupId)}/${settlementId}/payment-links`);
  return res.data.data;
};

/** 송금자: 송금 완료 체크(PENDING→SENT). */
export const confirmSent = async (groupId: number, settlementId: number): Promise<SettlementProgress> => {
  const res = await instance.patch<ApiResponse<SettlementProgress>>(`${base(groupId)}/${settlementId}/sent`);
  return res.data.data;
};

/** 수취인: 입금 수령 확인(SENT→COMPLETED). */
export const confirmReceived = async (groupId: number, settlementId: number): Promise<SettlementProgress> => {
  const res = await instance.patch<ApiResponse<SettlementProgress>>(`${base(groupId)}/${settlementId}/complete`);
  return res.data.data;
};
