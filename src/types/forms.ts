import type { PaymentFrequency } from './api';

export type TransactionTypeFilter = 'all' | 'income' | 'expense' | 'installment';

export interface TransactionFilterState {
  type: TransactionTypeFilter;
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface TransactionFormModel {
  student_id: number | null;
  amount: number | null;
  note: string;
  is_installment: boolean;
  is_expense: boolean;
  total_amount?: number | null | undefined;
  total_installments?: number | null | undefined;
  frequency?: PaymentFrequency | null | undefined;
  custom_days?: number | null | undefined;
  due_date?: string | null | undefined;
}
