import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type {
  Expense,
  SettlementSummary,
  ExpenseCreateRequest,
  ExpenseUpdateRequest,
} from '../types/expense';

/** 정산 API (백엔드 Part B: 목록/등록 /expenses, 정산 매트릭스 /settlements). */

/** 지출 목록. */
export const getExpenses = async (groupId: number): Promise<Expense[]> => {
  const res = await instance.get<ApiResponse<Expense[]>>(`/api/groups/${groupId}/expenses`);
  return res.data.data;
};

/** 정산 매트릭스(총액·1인당·잔액·최소 송금). 경로: GET /settlements */
export const getSettlement = async (groupId: number): Promise<SettlementSummary> => {
  const res = await instance.get<ApiResponse<SettlementSummary>>(`/api/groups/${groupId}/settlements`);
  return res.data.data;
};

/** 지출 추가. */
export const addExpense = async (groupId: number, body: ExpenseCreateRequest): Promise<Expense> => {
  const res = await instance.post<ApiResponse<Expense>>(`/api/groups/${groupId}/expenses`, body);
  return res.data.data;
};

/** 지출 수정. */
export const updateExpense = async (
  groupId: number,
  expenseId: number,
  body: ExpenseUpdateRequest,
): Promise<Expense> => {
  const res = await instance.patch<ApiResponse<Expense>>(
    `/api/groups/${groupId}/expenses/${expenseId}`,
    body,
  );
  return res.data.data;
};

/** 지출 삭제. */
export const deleteExpense = async (groupId: number, expenseId: number): Promise<void> => {
  await instance.delete<ApiResponse<unknown>>(`/api/groups/${groupId}/expenses/${expenseId}`);
};
