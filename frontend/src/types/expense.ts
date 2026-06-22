/**
 * ⚠️ PLACEHOLDER — 정산(B 도메인) DTO 미확정. 백엔드 확정 시 필드 교체.
 */

export interface Expense {
  id: number;
  title: string;
  /** 원 단위 금액 */
  amount: number;
  payerId: number;
  payerName: string;
  /** 분담 대상 userId 목록 */
  participantIds: number[];
  /** 항목 카테고리(식비/교통/숙박/기타 등) */
  category: string;
  createdAt: string; // ISO
}

/** 정산 송금 1건(누가 → 누구에게). */
export interface Settlement {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  amount: number;
}

export interface ExpenseSummary {
  total: number;
  perPerson: number;
  memberCount: number;
  settlements: Settlement[];
}

export interface ExpenseCreateRequest {
  title: string;
  amount: number;
  payerId: number;
  participantIds: number[];
  category: string;
}

export type ExpenseUpdateRequest = ExpenseCreateRequest;

export const EXPENSE_CATEGORIES = ['식비', '교통', '숙박', '관광', '쇼핑', '기타'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const ICON: Record<string, string> = {
  식비: '🍽️', 교통: '🚗', 숙박: '🏨', 관광: '🎟️', 쇼핑: '🛍️', 기타: '💳',
};
export const expenseIcon = (category: string): string => ICON[category] ?? '💳';

export const formatWon = (n: number): string => `₩ ${n.toLocaleString('ko-KR')}`;
