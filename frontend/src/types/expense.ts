/**
 * 정산(FR-EXPENSE) — 백엔드 Part B 계약에 맞춤.
 *  - 지출: ExpenseResponse (amount Long, category enum, splitType, description, paidAt, splits[])
 *  - 정산 매트릭스: SettlementSummaryResponse (balances[], transfers[]) — GET /settlements
 */

export type ExpenseCategory = 'MEAL' | 'LODGING' | 'TRANSPORT' | 'TICKET' | 'OTHER';
export type SplitType = 'EQUAL' | 'RATIO' | 'AMOUNT';

export interface ExpenseSplit {
  userId: number;
  name: string;
  owedAmount: number;
}

/** ExpenseResponse. */
export interface Expense {
  id: number;
  groupId: number;
  payerId: number;
  payerName: string;
  createdByUserId: number;
  amount: number;
  category: ExpenseCategory;
  splitType: SplitType;
  description: string;
  paidAt: string; // YYYY-MM-DD
  sourceScheduleId: number | null;
  splits: ExpenseSplit[];
}

/** ExpenseCreateRequest (EQUAL 분담 기준). */
export interface ExpenseCreateRequest {
  amount: number;
  payerId: number;
  category: ExpenseCategory;
  splitType: SplitType;
  description: string;
  paidAt: string;
  participantIds: number[];
}

export type ExpenseUpdateRequest = ExpenseCreateRequest;

/* ── 정산 매트릭스 (GET /settlements = SettlementSummaryResponse) ── */
export interface SettlementBalance {
  userId: number;
  name: string;
  paidAmount: number;
  owedAmount: number;
  balanceAmount: number; // +면 받을 돈, -면 줄 돈
}

export interface SettlementTransfer {
  fromUserId: number;
  fromName: string;
  toUserId: number;
  toName: string;
  amount: number;
}

export interface SettlementSummary {
  groupId: number;
  totalExpenseAmount: number;
  averagePerMemberAmount: number;
  balances: SettlementBalance[];
  transfers: SettlementTransfer[];
}

/* ── 표시 상수 ── */
export const EXPENSE_CATEGORIES: ReadonlyArray<{ value: ExpenseCategory; label: string }> = [
  { value: 'MEAL', label: '식비' },
  { value: 'LODGING', label: '숙박' },
  { value: 'TRANSPORT', label: '교통' },
  { value: 'TICKET', label: '입장료' },
  { value: 'OTHER', label: '기타' },
];

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  MEAL: '식비',
  LODGING: '숙박',
  TRANSPORT: '교통',
  TICKET: '입장료',
  OTHER: '기타',
};

const ICON: Record<ExpenseCategory, string> = {
  MEAL: '🍽️',
  LODGING: '🏨',
  TRANSPORT: '🚗',
  TICKET: '🎟️',
  OTHER: '💳',
};
export const expenseIcon = (category: ExpenseCategory): string => ICON[category] ?? '💳';

export const formatWon = (n: number): string => `₩ ${n.toLocaleString('ko-KR')}`;
