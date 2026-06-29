/** 정산 송금 워크플로우(FR-EXPENSE-05/06) 타입 — 백엔드 Settlement 계약. */

export type SettlementStatus = 'PENDING' | 'SENT' | 'COMPLETED';

/** 저장된 송금 1건. */
export interface SettlementRecord {
  id: number;
  fromUserId: number;
  fromName: string;
  toUserId: number;
  toName: string;
  amount: number;
  status: SettlementStatus;
  senderConfirmedAt: string | null;
  receiverConfirmedAt: string | null;
}

/** 정산 진행 상태. started=false 이면 아직 정산 미시작(transfers 비어 있음). */
export interface SettlementProgress {
  groupId: number;
  started: boolean;
  completed: boolean;
  transfers: SettlementRecord[];
}

/** 송금 딥링크(FR-EXPENSE-05). PC는 프론트에서 QR로 인코딩. */
export interface PaymentLinks {
  settlementId: number;
  amount: number;
  memo: string;
  tossDeepLink: string;
  kakaoPayDeepLink: string;
  /** 받는 사람이 마이페이지에 저장한 송금 링크/계좌(없으면 null). */
  receiverPayoutLink: string | null;
  receiverPayoutAccount: string | null;
}
