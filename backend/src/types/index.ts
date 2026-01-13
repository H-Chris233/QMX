/**
 * 学员相关类型定义
 */

// 班级类型枚举 (与数据库 schema/students.ts 一致)
export enum ClassType {
  TEN_TRY = 'TEN_TRY',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  OTHERS = 'OTHERS',
}

// 科目类型枚举 (与数据库 schema/students.ts 一致)
export enum SubjectType {
  SHOOTING = 'SHOOTING',
  ARCHERY = 'ARCHERY',
  OTHERS = 'OTHERS',
}

// 兼容旧类型名
export type Subject = SubjectType;

export enum MembershipStatus {
  NONE = 'NONE',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  UPCOMING = 'UPCOMING',
}

// 分期付款状态类型 (与数据库一致)
export type InstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

// 分期计划状态类型 (与数据库一致)
export type InstallmentPlanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

// 付款频率类型 (与数据库一致)
export type PaymentFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM';

// 付款频率常量 (用于 switch case)
export const PaymentFrequencyValues = {
  WEEKLY: 'WEEKLY' as PaymentFrequency,
  MONTHLY: 'MONTHLY' as PaymentFrequency,
  QUARTERLY: 'QUARTERLY' as PaymentFrequency,
  CUSTOM: 'CUSTOM' as PaymentFrequency,
};

// 分期状态常量 (用于 switch case)
export const InstallmentStatusValues = {
  PENDING: 'PENDING' as InstallmentStatus,
  PAID: 'PAID' as InstallmentStatus,
  OVERDUE: 'OVERDUE' as InstallmentStatus,
  CANCELLED: 'CANCELLED' as InstallmentStatus,
};

// 分期计划状态常量 (用于 switch case)
export const InstallmentPlanStatusValues = {
  ACTIVE: 'ACTIVE' as InstallmentPlanStatus,
  COMPLETED: 'COMPLETED' as InstallmentPlanStatus,
  CANCELLED: 'CANCELLED' as InstallmentPlanStatus,
};

// 学员接口
export interface IStudent {
  uid: number;
  name: string;
  age: number | null;
  phone: string;
  classType: ClassType;
  subject: Subject;
  rings: number[];
  note: string | null;
  lessonLeft: number | null;
  class?: never;
  membershipStartDate: Date | null;
  membershipEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // 禁止使用下划线版本的字段名
  membership_start_date?: never;
  membership_end_date?: never;
  lesson_left?: never;
}

// 学员创建属性
export interface IStudentCreationAttributes extends Omit<IStudent, 'uid' | 'createdAt' | 'updatedAt' | 'created_at' | 'updated_at'> {}

// 交易关联的分期快照
export interface ICashInstallmentSnapshot {
  plan_uid: number;
  installment_uid?: number | null;
  installment_number?: number | null;
  total_installments?: number | null;
  due_date?: string | null;
  status?: string | null;
  note?: string | null;
}

// 交易记录接口
export interface ICash {
  uid: number;
  studentId: number | null;
  amount: number;
  note: string | null;
  installmentSnapshot?: ICashInstallmentSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
}

// 交易创建属性
export interface ICashCreationAttributes {
  student_id?: number | null;
  studentId?: number | null;
  amount: number;
  note?: string | null;
  installment?: ICashInstallmentSnapshot | null;
}

// 分期付款计划接口
export interface IInstallmentPlan {
  uid: number;
  studentId: number;
  totalAmount: number;
  downPayment: number;
  totalInstallments: number;
  frequency: PaymentFrequency;
  customDays: number | null;
  startDate: Date;
  status: InstallmentPlanStatus;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 分期付款创建属性
export interface IInstallmentPlanCreationAttributes extends Omit<IInstallmentPlan, 'uid' | 'created_at' | 'createdAt' | 'updated_at' | 'updatedAt'> {}

// 分期付款详情接口
export interface IInstallment {
  uid: number;
  planId: number;
  studentId: number;
  installmentNumber: number;
  installmentAmount: number;
  paidAmount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: InstallmentStatus;
  note: string | null;
  cashUid: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// 分期付款创建属性
export interface IInstallmentCreationAttributes extends Omit<IInstallment, 'uid' | 'created_at' | 'createdAt' | 'updated_at' | 'updatedAt'> {}

// 统计数据接口
export interface IDashboardStats {
  total_students: number;
  total_revenue: number;
  total_expense: number;
  net_income: number;
  average_score: number;
  max_score: number;
  active_courses: number;
  active_members: number;
  active_installments: number;
  overdue_installments: number;
}

// 学员统计数据
export interface IStudentStats {
  total_payments: number;
  payment_count: number;
  average_score?: number;
  max_score?: number;
  min_score?: number;
  score_count: number;
  membership_status: string;
  membership_status_code?: MembershipStatus;
  membership_is_active?: boolean;
  membership_days_remaining?: number | null;
  membership_days_until_start?: number | null;
  installment_stats: {
    total_amount: number;
    paid_amount: number;
    pending_amount?: number;
    pending_count: number;
    remaining_amount: number;
  };
}

// 财务统计数据
export interface IFinancialStats {
  period?: string;
  date_from?: Date | string;
  date_to?: Date | string;
  total_income: number;
  total_expense: number;
  net_income: number;
  net_profit?: number;
  is_profitable?: boolean;
  installment_total: number;
  installment_paid: number;
  installment_pending: number;
  installment_remaining?: number;
  transaction_count?: number;
  student_income?: Array<{
    student_id: number;
    student_name: string;
    amount: number;
  }>;
}

// 搜索选项接口
export interface IStudentSearchOptions {
  name_contains?: string | null;
  min_age?: number | null;
  max_age?: number | null;
  min_score?: number | null;
  max_score?: number | null;
  class_type?: ClassType | null;
  subject?: SubjectType | null;
  has_membership?: boolean | null;
  membership_active_at?: Date | string | null;
  membership_status?: MembershipStatus | null;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

// 现金搜索选项
export interface ICashSearchOptions {
  studentId?: number | null;
  student_id?: number | null;
  minAmount?: number | null;
  min_amount?: number | null;
  maxAmount?: number | null;
  max_amount?: number | null;
  hasInstallment?: boolean | null;
  has_installment?: boolean | null;
  dateFrom?: Date | string | null;
  date_from?: Date | string | null;
  dateTo?: Date | string | null;
  date_to?: Date | string | null;
  isIncome?: boolean | null;
  is_income?: boolean | null;
  page?: number;
  limit?: number;
  created_at?: Record<string, unknown>;
  sortBy?: 'uid' | 'student_id' | 'cash' | 'created_at' | 'updated_at';
  sort_by?: 'uid' | 'student_id' | 'cash' | 'created_at' | 'updated_at';
  sortOrder?: 'ASC' | 'DESC';
  sort_order?: 'ASC' | 'DESC';
}

// API响应接口
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
}

// 分页响应接口
export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}