import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type {
  ExpenseFilters,
  ExpenseRequest,
  ExpenseResponse,
  ExpenseSummaryResponse,
} from '../types/expense';

export const createExpense = async (
  groupId: number,
  request: ExpenseRequest,
): Promise<ExpenseResponse> => {
  const response = await instance.post<ApiResponse<ExpenseResponse>>(
    `/api/groups/${groupId}/expenses`,
    request,
  );
  return response.data.data;
};

export const getExpenses = async (
  groupId: number,
  filters: ExpenseFilters = {},
): Promise<ExpenseResponse[]> => {
  const response = await instance.get<ApiResponse<ExpenseResponse[]>>(
    `/api/groups/${groupId}/expenses`,
    { params: filters },
  );
  return response.data.data;
};

export const getExpenseSummary = async (
  groupId: number,
  filters: ExpenseFilters = {},
): Promise<ExpenseSummaryResponse> => {
  const response = await instance.get<ApiResponse<ExpenseSummaryResponse>>(
    `/api/groups/${groupId}/expenses/summary`,
    { params: filters },
  );
  return response.data.data;
};

export const updateExpense = async (
  groupId: number,
  expenseId: number,
  request: ExpenseRequest,
): Promise<ExpenseResponse> => {
  const response = await instance.patch<ApiResponse<ExpenseResponse>>(
    `/api/groups/${groupId}/expenses/${expenseId}`,
    request,
  );
  return response.data.data;
};

export const deleteExpense = async (groupId: number, expenseId: number): Promise<void> => {
  await instance.delete(`/api/groups/${groupId}/expenses/${expenseId}`);
};
