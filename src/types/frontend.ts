// 前端专用数据模型

import type { Student, Transaction, InstallmentStatus } from './api';

/**
 * 前端交易数据模型
 * 使用新的 Transaction 类型，但保留前端特有的 type 字段
 */
export interface FrontendTransaction {
  /** 交易ID */
  id: number;
  /** 交易类型（前端专用字段） */
  type: 'income' | 'expense';
  /** 交易描述 */
  description: string;
  /** 交易金额（绝对值，单位：元） */
  amount: number;
  /** 备注信息 */
  note: string | null;
  /** 是否为分期付款 */
  is_installment: boolean;
  /** 分期付款信息快照 */
  installment: {
    plan_uid: number;
    installment_uid?: number | null;
    installment_number?: number | null;
    total_installments?: number | null;
    due_date?: string | null;
    status?: InstallmentStatus | string | null;
    note?: string | null;
  } | null;
  /** 关联的学员ID */
  student_id: number | null;
  /** 创建时间 */
  created_at?: string;
  /** 更新时间 */
  updated_at?: string;
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
  /** 最小金额（单位：元） */
  min_amount: number | null;
  /** 最大金额（单位：元） */
  max_amount: number | null;
  /** 是否有分期付款 */
  has_installment: boolean | null;
  /** 开始日期 */
  date_from: string | null;
  /** 结束日期 */
  date_to: string | null;
}

// 类型转换函数
/**
 * 将 API Transaction 转换为前端 FrontendTransaction
 * @param transaction - API 返回的交易数据
 * @returns 前端交易数据
 */
export function mapApiTransactionToFrontend(transaction: Transaction): FrontendTransaction {
  const isIncome =
    transaction.is_income === true
      ? true
      : transaction.is_expense === true
        ? false
        : transaction.amount >= 0;

  const result: FrontendTransaction = {
    id: transaction.uid,
    type: isIncome ? 'income' : 'expense',
    description: transaction.description ?? '',
    amount: Math.abs(transaction.amount),
    note: transaction.note || null,
    is_installment: transaction.is_installment ?? false,
    installment: transaction.installment ?? null,
    student_id: transaction.student_id,
  };
  if (transaction.created_at !== undefined) {
    result.created_at = transaction.created_at;
  }
  if (transaction.updated_at !== undefined) {
    result.updated_at = transaction.updated_at;
  }
  return result;
}

// 类型守卫函数
/**
 * 检查对象是否为有效的 FrontendTransaction
 * @param obj - 待检查的对象
 * @returns 是否为 FrontendTransaction
 */
export function isFrontendTransaction(obj: unknown): obj is FrontendTransaction {
  if (!obj || typeof obj !== 'object') return false;
  const transaction = obj as Record<string, unknown>;

  return (
    typeof transaction.id === 'number' &&
    (transaction.type === 'income' || transaction.type === 'expense') &&
    (typeof transaction.description === 'string' || transaction.description === undefined) &&
    typeof transaction.amount === 'number' &&
    (typeof transaction.note === 'string' || transaction.note === null)
  );
}

/**
 * 检查对象是否为有效的 Student
 * @param obj - 待检查的对象
 * @returns 是否为 Student
 */
export function isStudent(obj: unknown): obj is Student {
  if (!obj || typeof obj !== 'object') return false;
  const student = obj as Record<string, unknown>;

  return (
    typeof student.uid === 'number' &&
    typeof student.name === 'string' &&
    typeof student.phone === 'string' &&
    Array.isArray(student.rings)
  );
}
