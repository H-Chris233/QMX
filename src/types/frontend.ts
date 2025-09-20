// 前端专用数据模型

import type { Student, Transaction, InstallmentStatus } from './api';

/**
 * 前端交易数据模型
 * 与后端 Transaction 接口保持一致，但使用不同的属性名
 */
export interface FrontendTransaction {
  /** 交易ID */
  id: number;
  /** 交易类型 */
  type: 'income' | 'expense';
  /** 交易描述 */
  description: string;
  /** 交易金额 */
  amount: number;
  /** 备注信息 */
  note: string | null;
  /** 是否为分期付款 */
  is_installment: boolean;
  /** 当前分期 */
  installment_current: number | null;
  /** 总分期数 */
  installment_total: number | null;
  /** 分期付款状态 */
  installment_status: InstallmentStatus | null;
  /** 关联的学员ID */
  student_id: number | null;
  /** 分期计划ID */
  installment_plan_id: number | null;
  /** 分期付款到期日期 */
  installment_due_date: string | null;
}

/**
 * 前端学员数据模型
 * 与API Student接口保持一致，用于前端显示学员信息
 */
export interface FrontendStudent extends Student {
  // 可以添加前端特有的属性
}

/**
 * 前端成绩数据模型
 */
export interface Grade {
  /** 成绩ID */
  id: number;
  /** 学员姓名 */
  studentName: string;
  /** 课程 */
  course: string;
  /** 考试类型 */
  examType: string;
  /** 分数 */
  score: number;
  /** 日期 */
  date: string;
  /** 关联的学员ID */
  studentId: number;
  /** 备注 */
  notes?: string | null;
}

/**
 * 前端搜索选项接口
 * 用于前端的搜索功能
 */
export interface SearchOptions {
  /** 学员ID */
  student_id: number | null;
  /** 最小金额 */
  min_amount: number | null;
  /** 最大金额 */
  max_amount: number | null;
  /** 是否有分期付款 */
  has_installment: boolean | null;
  /** 开始日期 */
  date_from: string | null;
  /** 结束日期 */
  date_to: string | null;
}

// 类型转换函数
export function mapApiTransactionToFrontend(transaction: Transaction): FrontendTransaction {
  return {
    id: transaction.uid,
    type: transaction.amount > 0 ? 'income' : 'expense',
    description: transaction.description,
    amount: Math.abs(transaction.amount),
    note: transaction.note || null,
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
    (typeof transaction.note === 'string' || transaction.note === null) &&
    typeof transaction.is_installment === 'boolean'
  );
}