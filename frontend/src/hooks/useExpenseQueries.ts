import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createExpense,
  deleteExpense,
  getExpenses,
  getExpenseSummary,
  updateExpense,
} from '../api/expense';
import { queryKeys } from '../lib/queryKeys';
import type { ExpenseFilters, ExpenseRequest } from '../types/expense';

interface UpdateExpenseVariables {
  expenseId: number;
  request: ExpenseRequest;
}

export function useExpensesQuery(
  groupId: number,
  filters: ExpenseFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.expenses.list(groupId, filters),
    queryFn: () => getExpenses(groupId, filters),
    enabled,
  });
}

export function useExpenseSummaryQuery(
  groupId: number,
  filters: ExpenseFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.expenses.summary(groupId, filters),
    queryFn: () => getExpenseSummary(groupId, filters),
    enabled,
  });
}

function useInvalidateExpenseData(groupId: number) {
  const queryClient = useQueryClient();

  return async () => {
    // 지출 변경은 목록·통계와 멤버별 잔액 기반 정산 결과를 동시에 바꾼다.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.group(groupId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(groupId) }),
    ]);
  };
}

export function useCreateExpenseMutation(groupId: number) {
  const invalidateExpenseData = useInvalidateExpenseData(groupId);

  return useMutation({
    mutationFn: (request: ExpenseRequest) => createExpense(groupId, request),
    onSuccess: invalidateExpenseData,
  });
}

export function useUpdateExpenseMutation(groupId: number) {
  const invalidateExpenseData = useInvalidateExpenseData(groupId);

  return useMutation({
    mutationFn: ({ expenseId, request }: UpdateExpenseVariables) =>
      updateExpense(groupId, expenseId, request),
    onSuccess: invalidateExpenseData,
  });
}

export function useDeleteExpenseMutation(groupId: number) {
  const invalidateExpenseData = useInvalidateExpenseData(groupId);

  return useMutation({
    mutationFn: (expenseId: number) => deleteExpense(groupId, expenseId),
    onSuccess: invalidateExpenseData,
  });
}
