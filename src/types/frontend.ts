// 前端专用数据模型

import type { Student, Transaction, InstallmentStatus } from './api';

// 前端交易数据模型
export interface FrontendTransaction {
  id: number;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  note: string;
  is_installment: boolean;
  installment_current: number | null;
  installment_total: number | null;
  installment_status: InstallmentStatus | null;
  student_id: number | null;
  installment_plan_id: number | null;
  installment_due_date: string | null;
}

// 前端学生数据模型（与API Student接口保持一致）
export interface FrontendStudent extends Student {
  // 可以添加前端特有的属性
}

// 前端成绩数据模型
export interface Grade {
  id: number;
  studentName: string;
  course: string;
  examType: string;
  score: number;
  date: string;
  studentId: number;
  notes?: string;
}

// 搜索选项接口
export interface SearchOptions {
  student_id: number | null;
  min_amount: number | null;
  max_amount: number | null;
  has_installment: boolean | null;
  date_from: string | null;
  date_to: string | null;
}

// 类型转换函数
export function mapApiTransactionToFrontend(transaction: Transaction): FrontendTransaction {
  return {
    id: transaction.uid,
    type: transaction.amount > 0 ? 'income' : 'expense',
    description: transaction.description,
    amount: Math.abs(transaction.amount),
    note: transaction.note || '',
    is_installment: transaction.is_installment,
    installment_current: transaction.installment_current,
    installment_total: transaction.installment_total,
    installment_status: transaction.installment_status,
    student_id: transaction.student_id,
    installment_plan_id: transaction.installment_plan_id,
    installment_due_date: transaction.installment_due_date,
  };
}

// 类型守卫函数
export function isFrontendTransaction(obj: unknown): obj is FrontendTransaction {
  if (!obj || typeof obj !== 'object') return false;
  const transaction = obj as Record<string, unknown>;
  
  return (
    typeof transaction.id === 'number' &&
    (transaction.type === 'income' || transaction.type === 'expense') &&
    typeof transaction.description === 'string' &&
    typeof transaction.amount === 'number' &&
    typeof transaction.note === 'string' &&
    typeof transaction.is_installment === 'boolean'
  );
}