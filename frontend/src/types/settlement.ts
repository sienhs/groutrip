export type SettlementStatus = 'PENDING' | 'SENT' | 'COMPLETED';

export interface SettlementBalanceResponse {
  userId: number;
  name: string;
  paidAmount: number;
  owedAmount: number;
  balanceAmount: number;
}

export interface SettlementTransferResponse {
  fromUserId: number;
  fromName: string;
  toUserId: number;
  toName: string;
  amount: number;
}

export interface SettlementSummaryResponse {
  groupId: number;
  totalExpenseAmount: number;
  averagePerMemberAmount: number;
  balances: SettlementBalanceResponse[];
  transfers: SettlementTransferResponse[];
}

export interface SettlementRecordResponse extends SettlementTransferResponse {
  id: number;
  status: SettlementStatus;
  senderConfirmedAt: string | null;
  receiverConfirmedAt: string | null;
}

export interface SettlementProgressResponse {
  groupId: number;
  completed: boolean;
  transfers: SettlementRecordResponse[];
}

export interface SettlementPaymentLinksResponse {
  settlementId: number;
  amount: number;
  memo: string;
  tossDeepLink: string;
  kakaoPayDeepLink: string;
}
