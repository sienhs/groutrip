export type ExpenseCategory = 'MEAL' | 'LODGING' | 'TRANSPORT' | 'TICKET' | 'OTHER';
export type SplitType = 'EQUAL' | 'RATIO' | 'AMOUNT';

export interface ExpenseSplitRequest {
  participantId: number;
  ratio: number | null;
  amount: number | null;
}

export interface ExpenseRequest {
  amount: number;
  payerId: number;
  category: ExpenseCategory;
  splitType: SplitType;
  description: string | null;
  paidAt: string;
  participantIds: number[] | null;
  splitDetails: ExpenseSplitRequest[] | null;
  sourceScheduleId: number | null;
}

export interface ExpenseSplitResponse {
  userId: number;
  name: string;
  owedAmount: number;
}

export interface ExpenseResponse {
  id: number;
  groupId: number;
  payerId: number;
  payerName: string;
  createdByUserId: number;
  amount: number;
  category: ExpenseCategory;
  splitType: SplitType;
  description: string | null;
  paidAt: string;
  sourceScheduleId: number | null;
  splits: ExpenseSplitResponse[];
}

export interface ExpenseFilters {
  category?: ExpenseCategory;
  payerId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseSummaryResponse {
  totalExpenseAmount: number;
  averagePerMemberAmount: number;
  categoryTotals: Array<{ category: ExpenseCategory; amount: number }>;
  dailyTotals: Array<{ date: string; amount: number }>;
}
