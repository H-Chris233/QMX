/**
 * QMX 数据转换工具集
 * 提供统一的数据验证、转换和格式化功能
 * 
 * 主要功能：
 * - 数值安全解析和范围验证
 * - 金额转换（分 ↔ 元）
 * - 交易数据验证和转换
 * - 成绩数据处理
 * - 会员信息标准化
 * - 日期格式化
 */

import type { Transaction, Student, DashboardStats } from '../types/api';

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 最大安全金额（单位：元）
 * 避免超过 JavaScript Number.MAX_SAFE_INTEGER
 */
export const MAX_SAFE_AMOUNT = 999999999999; // 9999亿元

/**
 * 最小金额（单位：元）
 */
export const MIN_AMOUNT = -999999999999; // 允许负数表示支出

/**
 * 金额小数位数
 */
export const AMOUNT_DECIMALS = 2;

/**
 * 分到元的转换比率
 */
export const CENTS_TO_YUAN = 100;

/**
 * 最大学生数量
 */
export const MAX_STUDENTS = 100000;

/**
 * 最大成绩值
 */
export const MAX_SCORE = 1000;

/**
 * 最小成绩值
 */
export const MIN_SCORE = 0;

/**
 * 成绩小数位数
 */
export const SCORE_DECIMALS = 1;

/**
 * 会员到期提醒天数
 */
export const MEMBERSHIP_EXPIRY_WARNING_DAYS = 7;

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 数字解析选项
 */
export interface ParseNumberOptions {
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 小数位数 */
  decimals?: number;
  /** 是否允许负数 */
  allowNegative?: boolean;
}

/**
 * 简化的交易数据（前端使用）
 */
export interface SimplifiedTransaction {
  id?: number;
  uid?: number;
  student_id?: number | null;
  amount: number;
  description?: string;
  note?: string | null;
  is_income?: boolean;
  is_expense?: boolean;
  is_installment?: boolean;
  installment_current?: number | null;
  installment_total?: number | null;
  created_at?: string | undefined;
}

/**
 * 会员记录（标准化后）
 */
export interface NormalizedMembershipRecord {
  uid: number;
  name: string;
  phone?: string | undefined;
  membership_start_date: string | null;
  membership_end_date: string | null;
  is_membership_active: boolean;
  membership_days_remaining: number | null;
  membership_status: string;
}

/**
 * 仪表板数据（转换后）
 */
export interface TransformedDashboardData {
  totalRevenue: number;
  activeStudents: number;
  averageGrade: number;
}

// ============================================================================
// 数字解析和验证
// ============================================================================

/**
 * 安全解析数字，支持范围和小数控制
 * 
 * @example
 * ```typescript
 * // 基础用法
 * safeParseNumber("123.45", 0) // 123.45
 * 
 * // 带范围控制
 * safeParseNumber("150", 0, { min: 0, max: 100 }) // 100
 * 
 * // 控制小数位数
 * safeParseNumber("123.456", 0, { decimals: 2 }) // 123.46
 * 
 * // 组合使用
 * safeParseNumber("-50", 0, { min: 0, max: 1000, decimals: 2 }) // 0
 * ```
 * 
 * @param value - 要解析的值（数字、字符串或其他类型）
 * @param fallback - 解析失败时的默认值
 * @param options - 解析选项（范围、小数位等）
 * @returns 解析并验证后的数字
 */
export function safeParseNumber(
  value: unknown,
  fallback: number = 0,
  options: ParseNumberOptions = {}
): number {
  const { min, max, decimals, allowNegative = true } = options;

  // 尝试转换为数字
  let num: number;
  
  if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
    num = value;
  } else if (typeof value === 'string') {
    const parsed = parseFloat(value.trim());
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      num = parsed;
    } else {
      return fallback;
    }
  } else {
    return fallback;
  }

  // 处理负数
  if (!allowNegative && num < 0) {
    num = 0;
  }

  // 应用范围限制
  if (typeof min === 'number' && num < min) {
    num = min;
  }
  if (typeof max === 'number' && num > max) {
    num = max;
  }

  // 处理小数位数
  if (typeof decimals === 'number' && decimals >= 0) {
    num = parseFloat(num.toFixed(decimals));
  }

  return num;
}

/**
 * 验证数字是否在有效范围内
 * 
 * @param value - 要验证的值
 * @param min - 最小值
 * @param max - 最大值
 * @returns 是否有效
 */
export function isNumberInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && 
         !Number.isNaN(value) && 
         Number.isFinite(value) &&
         value >= min && 
         value <= max;
}

// ============================================================================
// 仪表板数据转换
// ============================================================================

/**
 * 转换仪表板统计数据
 * 将后端返回的原始统计数据转换为前端使用的格式
 * 
 * 后端返回的金额已经是元（由 statsService 转换），这里只做数据映射和验证
 * 
 * @example
 * ```typescript
 * const raw = {
 *   total_revenue: 12345.67,
 *   total_students: 150,
 *   average_score: 8.5
 * };
 * transformDashboardData(raw)
 * // { totalRevenue: 12345.67, activeStudents: 150, averageGrade: 8.5 }
 * ```
 * 
 * @param raw - 后端返回的原始统计数据
 * @returns 转换后的仪表板数据
 */
export function transformDashboardData(raw: DashboardStats): TransformedDashboardData {
  const source = raw as unknown as {
    total_revenue?: number;
    total_students?: number;
    average_score?: number;
    totalRevenue?: number;
    totalStudents?: number;
    activeStudents?: number;
    averageGrade?: number;
  };

  const totalRevenueValue = source.total_revenue ?? source.totalRevenue ?? 0;
  const totalStudentsValue = source.activeStudents ?? source.total_students ?? source.totalStudents ?? 0;
  const averageScoreValue = source.average_score ?? source.averageGrade ?? 0;

  return {
    totalRevenue: safeParseNumber(totalRevenueValue, 0, {
      min: MIN_AMOUNT,
      max: MAX_SAFE_AMOUNT,
      decimals: AMOUNT_DECIMALS,
    }),
    activeStudents: safeParseNumber(totalStudentsValue, 0, {
      min: 0,
      max: MAX_STUDENTS,
      decimals: 0,
      allowNegative: false,
    }),
    averageGrade: safeParseNumber(averageScoreValue, 0, {
      min: MIN_SCORE,
      max: MAX_SCORE,
      decimals: SCORE_DECIMALS,
      allowNegative: false,
    }),
  };
}

// ============================================================================
// 交易数据转换和验证
// ============================================================================

/**
 * 生成交易描述文案
 * 
 * @param transaction - 交易数据
 * @returns 描述文案
 */
function generateTransactionDescription(transaction: Partial<Transaction>): string {
  if (transaction.description) {
    return transaction.description;
  }

  const isIncome = transaction.amount ? transaction.amount > 0 : false;
  const isInstallment = transaction.is_installment || false;

  if (isInstallment && transaction.installment) {
    const { installment_number, total_installments } = transaction.installment;
    return `分期付款 ${installment_number || '?'}/${total_installments || '?'}`;
  }

  return isIncome ? '收入' : '支出';
}

/**
 * 验证交易数据的完整性和有效性
 * 
 * @param transaction - 要验证的交易数据
 * @returns 验证是否通过
 */
export function validateTransactionData(transaction: unknown): boolean {
  if (!transaction || typeof transaction !== 'object') {
    return false;
  }

  const tx = transaction as Partial<Transaction>;

  // 必须有有效的金额
  if (typeof tx.amount !== 'number' || Number.isNaN(tx.amount) || !Number.isFinite(tx.amount)) {
    return false;
  }

  // 金额必须在安全范围内
  if (!isNumberInRange(tx.amount, MIN_AMOUNT, MAX_SAFE_AMOUNT)) {
    return false;
  }

  // 如果是分期付款，必须有分期信息
  if (tx.is_installment && !tx.installment) {
    return false;
  }

  return true;
}

/**
 * 安全映射 API 交易数据到前端格式
 * 
 * 注意：后端返回的 amount 字段已经是元（由控制器转换）
 * 这个函数主要负责：
 * 1. 数据验证和容错处理
 * 2. 添加辅助字段（is_income、is_expense、formatted_amount 等）
 * 3. 生成描述文案
 * 
 * @example
 * ```typescript
 * const apiTransaction = {
 *   uid: 1,
 *   amount: 123.45, // 后端已转换为元
 *   note: "测试交易",
 *   is_installment: true,
 *   installment: { installment_number: 1, total_installments: 3 }
 * };
 * 
 * safeMapApiTransactionToFrontend(apiTransaction)
 * // {
 * //   uid: 1,
 * //   amount: 123.45,
 * //   is_income: true,
 * //   is_expense: false,
 * //   description: "分期付款 1/3",
 * //   formatted_amount: "+123.45 元",
 * //   ...
 * // }
 * ```
 * 
 * @param transaction - API 返回的交易数据（金额已经是元）
 * @returns 前端使用的交易数据，验证失败返回 null
 */
export function safeMapApiTransactionToFrontend(transaction: unknown): SimplifiedTransaction | null {
  if (!validateTransactionData(transaction)) {
    return null;
  }

  const tx = transaction as Transaction;
  
  // 金额已经是元，无需转换
  const amount = safeParseNumber(tx.amount, 0, {
    min: MIN_AMOUNT,
    max: MAX_SAFE_AMOUNT,
    decimals: AMOUNT_DECIMALS,
  });

  const isIncome = amount > 0;
  const isExpense = amount < 0;
  const isInstallment = tx.is_installment || false;

  // 提取分期信息
  let installmentCurrent: number | null = null;
  let installmentTotal: number | null = null;

  if (isInstallment && tx.installment) {
    installmentCurrent = tx.installment.installment_number || null;
    installmentTotal = tx.installment.total_installments || null;
  }

  // 生成描述
  const description = generateTransactionDescription(tx);

  return {
    id: tx.uid,
    uid: tx.uid,
    student_id: tx.student_id || null,
    amount,
    description,
    note: tx.note || null,
    is_income: isIncome,
    is_expense: isExpense,
    is_installment: isInstallment,
    installment_current: installmentCurrent,
    installment_total: installmentTotal,
    created_at: tx.created_at || undefined,
  };
}

/**
 * 验证交易输入数据
 * 用于前端表单验证
 * 
 * @param input - 交易输入数据
 * @returns { valid: boolean, errors: string[] }
 */
export function validateTransactionInput(input: Partial<SimplifiedTransaction>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 金额验证
  if (typeof input.amount !== 'number') {
    errors.push('金额必须是数字');
  } else if (Number.isNaN(input.amount) || !Number.isFinite(input.amount)) {
    errors.push('金额格式无效');
  } else if (!isNumberInRange(input.amount, MIN_AMOUNT, MAX_SAFE_AMOUNT)) {
    errors.push(`金额必须在 ${MIN_AMOUNT} 到 ${MAX_SAFE_AMOUNT} 之间`);
  }

  // 学生ID验证（可选）
  if (input.student_id !== null && input.student_id !== undefined) {
    if (typeof input.student_id !== 'number' || input.student_id < 1) {
      errors.push('学生ID必须是正整数');
    }
  }

  // 分期信息验证
  if (input.is_installment) {
    if (typeof input.installment_current !== 'number' || input.installment_current < 1) {
      errors.push('分期期数必须是正整数');
    }
    if (typeof input.installment_total !== 'number' || input.installment_total < 1) {
      errors.push('总分期数必须是正整数');
    }
    if (
      typeof input.installment_current === 'number' &&
      typeof input.installment_total === 'number' &&
      input.installment_current > input.installment_total
    ) {
      errors.push('当前期数不能大于总期数');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证简化的交易数据
 * 用于快速校验，不返回详细错误信息
 * 
 * @param transaction - 简化的交易数据
 * @returns 是否有效
 */
export function validateSimplifiedTransaction(transaction: Partial<SimplifiedTransaction>): boolean {
  const result = validateTransactionInput(transaction);
  return result.valid;
}

// ============================================================================
// 成绩数据处理
// ============================================================================

/**
 * 验证成绩输入
 * 
 * @example
 * ```typescript
 * validateScoreInput(85.5) // { valid: true, errors: [] }
 * validateScoreInput(1500) // { valid: false, errors: ['成绩超出有效范围'] }
 * validateScoreInput("abc") // { valid: false, errors: ['成绩必须是数字'] }
 * ```
 * 
 * @param score - 成绩值
 * @returns { valid: boolean, errors: string[] }
 */
export function validateScoreInput(score: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof score !== 'number') {
    errors.push('成绩必须是数字');
  } else if (Number.isNaN(score) || !Number.isFinite(score)) {
    errors.push('成绩格式无效');
  } else if (!isNumberInRange(score, MIN_SCORE, MAX_SCORE)) {
    errors.push(`成绩必须在 ${MIN_SCORE} 到 ${MAX_SCORE} 之间`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 格式化成绩显示
 * 兼容 rings 字段（后端使用 rings 存储成绩数组）
 * 
 * @example
 * ```typescript
 * formatScore(85.567) // "85.6"
 * formatScore("90") // "90.0"
 * formatScore(null, "N/A") // "N/A"
 * ```
 * 
 * @param score - 成绩值
 * @param fallback - 无效时的默认值
 * @returns 格式化后的成绩字符串
 */
export function formatScore(score: unknown, fallback: string = '--'): string {
  const num = safeParseNumber(score, NaN, {
    min: MIN_SCORE,
    max: MAX_SCORE,
    decimals: SCORE_DECIMALS,
    allowNegative: false,
  });

  if (Number.isNaN(num)) {
    return fallback;
  }

  return num.toFixed(SCORE_DECIMALS);
}

/**
 * 计算成绩统计信息
 * 兼容 rings 数组
 * 
 * @param scores - 成绩数组（rings）
 * @returns 统计信息
 */
export function calculateScoreStats(scores: number[]): {
  average: number;
  max: number;
  min: number;
  count: number;
} {
  if (!Array.isArray(scores) || scores.length === 0) {
    return {
      average: 0,
      max: 0,
      min: 0,
      count: 0,
    };
  }

  const validScores = scores.filter((score) => 
    typeof score === 'number' && !Number.isNaN(score) && Number.isFinite(score)
  );

  if (validScores.length === 0) {
    return {
      average: 0,
      max: 0,
      min: 0,
      count: 0,
    };
  }

  const sum = validScores.reduce((acc, score) => acc + score, 0);
  const average = sum / validScores.length;
  const max = Math.max(...validScores);
  const min = Math.min(...validScores);

  return {
    average: parseFloat(average.toFixed(SCORE_DECIMALS)),
    max: parseFloat(max.toFixed(SCORE_DECIMALS)),
    min: parseFloat(min.toFixed(SCORE_DECIMALS)),
    count: validScores.length,
  };
}

// ============================================================================
// 会员数据处理
// ============================================================================

/**
 * 标准化会员记录
 * 确保会员数据的一致性和完整性
 * 
 * @example
 * ```typescript
 * const raw = {
 *   uid: 1,
 *   name: "张三",
 *   membership_start_date: "2024-01-01",
 *   membership_end_date: "2024-12-31",
 *   is_membership_active: true,
 *   membership_days_remaining: 30
 * };
 * 
 * normalizeMembershipRecord(raw)
 * // {
 * //   uid: 1,
 * //   name: "张三",
 * //   membership_start_date: "2024-01-01",
 * //   membership_end_date: "2024-12-31",
 * //   is_membership_active: true,
 * //   membership_days_remaining: 30,
 * //   membership_status: "Active"
 * // }
 * ```
 * 
 * @param record - 原始会员记录
 * @returns 标准化后的会员记录
 */
export function normalizeMembershipRecord(record: Partial<Student>): NormalizedMembershipRecord | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  // 必需字段验证
  if (!record.uid || !record.name) {
    return null;
  }

  // 计算会员状态
  let membershipStatus = 'None';
  let daysRemaining = record.membership_days_remaining || null;

  if (record.is_membership_active) {
    membershipStatus = 'Active';
  } else if (record.membership_end_date) {
    const endDate = new Date(record.membership_end_date);
    const now = new Date();
    if (endDate < now) {
      membershipStatus = 'Expired';
    } else if (record.membership_start_date) {
      const startDate = new Date(record.membership_start_date);
      if (startDate > now) {
        membershipStatus = 'Upcoming';
      }
    }
  }

  return {
    uid: record.uid,
    name: record.name,
    phone: record.phone,
    membership_start_date: record.membership_start_date || null,
    membership_end_date: record.membership_end_date || null,
    is_membership_active: record.is_membership_active || false,
    membership_days_remaining: daysRemaining,
    membership_status: membershipStatus,
  };
}

/**
 * 格式化日期范围
 * 
 * @example
 * ```typescript
 * formatDateRange("2024-01-01", "2024-12-31")
 * // "2024-01-01 至 2024-12-31"
 * 
 * formatDateRange("2024-01-01", null)
 * // "2024-01-01 起"
 * 
 * formatDateRange(null, "2024-12-31")
 * // "至 2024-12-31"
 * ```
 * 
 * @param startDate - 开始日期（ISO 格式字符串）
 * @param endDate - 结束日期（ISO 格式字符串）
 * @returns 格式化后的日期范围字符串
 */
export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): string {
  if (!startDate && !endDate) {
    return '--';
  }

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return '';
      const isoDate = date.toISOString().split('T')[0];
      return isoDate || '';
    } catch {
      return '';
    }
  };

  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start && end) {
    return `${start} 至 ${end}`;
  } else if (start) {
    return `${start} 起`;
  } else if (end) {
    return `至 ${end}`;
  }

  return '--';
}

/**
 * 计算会员剩余天数
 * 
 * @param endDate - 会员结束日期
 * @returns 剩余天数，null 表示无会员或日期无效
 */
export function calculateMembershipDaysRemaining(endDate: string | null | undefined): number | null {
  if (!endDate) return null;

  try {
    const end = new Date(endDate);
    const now = new Date();
    
    if (Number.isNaN(end.getTime())) return null;

    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  } catch {
    return null;
  }
}

/**
 * 判断会员是否即将过期
 * 
 * @param daysRemaining - 剩余天数
 * @param warningDays - 提醒天数阈值
 * @returns 是否即将过期
 */
export function isMembershipExpiringSoon(
  daysRemaining: number | null,
  warningDays: number = MEMBERSHIP_EXPIRY_WARNING_DAYS
): boolean {
  if (daysRemaining === null || daysRemaining < 0) return false;
  return daysRemaining <= warningDays;
}

// ============================================================================
// 日期格式化
// ============================================================================

/**
 * 格式化日期为可读格式
 * 
 * @example
 * ```typescript
 * formatDate("2024-01-15T10:30:00Z") // "2024-01-15"
 * formatDate("2024-01-15T10:30:00Z", "datetime") // "2024-01-15 10:30:00"
 * formatDate(null) // "--"
 * ```
 * 
 * @param date - 日期字符串或 Date 对象
 * @param format - 格式类型：'date' | 'datetime' | 'time'
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: 'date' | 'datetime' | 'time' = 'date'
): string {
  if (!date) return '--';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '--';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    switch (format) {
      case 'date':
        return `${year}-${month}-${day}`;
      case 'datetime':
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      case 'time':
        return `${hours}:${minutes}:${seconds}`;
      default:
        return `${year}-${month}-${day}`;
    }
  } catch {
    return '--';
  }
}

// ============================================================================
// 货币格式化
// ============================================================================

/**
 * 格式化货币显示
 * 
 * @example
 * ```typescript
 * formatCurrency(1234.56) // "¥1,234.56"
 * formatCurrency(-100) // "-¥100.00"
 * formatCurrency(0) // "¥0.00"
 * ```
 * 
 * @param amount - 金额（单位：元）
 * @param showSign - 是否显示正负号
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(amount: number, showSign: boolean = false): string {
  const num = safeParseNumber(amount, 0, {
    min: MIN_AMOUNT,
    max: MAX_SAFE_AMOUNT,
    decimals: AMOUNT_DECIMALS,
  });

  const sign = num >= 0 ? '+' : '';
  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: AMOUNT_DECIMALS,
    maximumFractionDigits: AMOUNT_DECIMALS,
  }).format(Math.abs(num));

  if (showSign && num >= 0) {
    return sign + formatted;
  } else if (num < 0) {
    return '-' + formatted;
  }

  return formatted;
}

// ============================================================================
// 辅助工具函数
// ============================================================================

/**
 * 安全的 JSON 序列化
 * 
 * @param data - 要序列化的数据
 * @param fallback - 失败时的默认值
 * @returns JSON 字符串
 */
export function safeJsonStringify(data: unknown, fallback: string = '{}'): string {
  try {
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
}

/**
 * 安全的 JSON 解析
 * 
 * @param json - JSON 字符串
 * @param fallback - 失败时的默认值
 * @returns 解析后的对象
 */
export function safeJsonParse<T = unknown>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * 防抖函数
 * 
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数
 * 
 * @param fn - 要节流的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}
