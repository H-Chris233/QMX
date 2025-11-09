/**
 * 学员相关类型定义
 */

// 班级类型枚举
export enum ClassType {
  TEN_TRY = 'TenTry',
  MONTH = 'Month', 
  YEAR = 'Year',
  OTHERS = 'Others',
}

// 科目类型枚举
export enum SubjectType {
  SHOOTING = 'Shooting',
  ARCHERY = 'Archery',
  OTHERS = 'Others',
}

export enum MembershipStatus {
  NONE = 'None',
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  UPCOMING = 'Upcoming',
}

// 分期付款状态枚举
export enum InstallmentStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  CANCELLED = 'Cancelled',
}

// 付款频率枚举
export enum PaymentFrequency {
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
  QUARTERLY = 'Quarterly',
  CUSTOM = 'Custom',
}

export enum InstallmentPlanStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

// 学员接口
export interface IStudent {
  uid: number;
  name: string;
  age: number | null;
  phone: string;
  class: ClassType;
  subject: SubjectType;
  rings: number[];
  note: string;
  lesson_left: number | null;
  lessonLeft?: number | null;
  membership_start_date: string | null;
  membershipStartDate?: string | null;
  membership_end_date: string | null;
  membershipEndDate?: string | null;
  membership_days_remaining: number | null;
  membershipDaysRemaining?: number | null;
  is_membership_active: boolean;
  isMembershipActive?: boolean;
  membership_status?: MembershipStatus;
  membershipStatus?: MembershipStatus;
  created_at?: string | null;
  createdAt?: Date;
  updated_at?: string | null;
  updatedAt?: Date;
}

// 学员创建属性
export interface IStudentCreationAttributes extends Omit<IStudent, 'uid' | 'createdAt' | 'updatedAt' | 'created_at' | 'updated_at'> {}

// 交易关联的分期快照
export interface ICashInstallmentSnapshot {
  plan_uid: number;
  installment_uid?: number | null;
  installment_number?: number | null;
  total_installments?: number | null;
  due_date?: Date | string | null;
  status?: InstallmentStatus | string | null;
  note?: string | null;
}

// 交易记录接口
export interface ICash {
  uid: number;
  student_id: number | null;
  studentId?: number | null;
  cash: number;
  amount_in_cents?: number;
  amountInCents?: number;
  amount: number;
  note: string | null;
  installment?: ICashInstallmentSnapshot | null;
  student?: Record<string, unknown> | null;
  is_income: boolean;
  isIncome?: boolean;
  is_expense: boolean;
  isExpense?: boolean;
  formatted_amount: string;
  formattedAmount?: string;
  description?: string;
  created_at: Date | string;
  createdAt?: Date;
  updated_at?: Date | string;
  updatedAt?: Date;
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
  student_id: number | null;
  studentId?: number | null;
  total_amount: number;
  totalAmount?: number;
  total_installments: number;
  totalInstallments?: number;
  frequency: PaymentFrequency;
  custom_days?: number | null;
  customDays?: number | null;
  start_date: Date | string;
  startDate?: Date | string;
  status: InstallmentPlanStatus;
  note?: string | null;
  created_at: Date | string;
  createdAt?: Date;
  updated_at: Date | string;
  updatedAt?: Date;
}

// 分期付款创建属性
export interface IInstallmentPlanCreationAttributes extends Omit<IInstallmentPlan, 'uid' | 'created_at' | 'createdAt' | 'updated_at' | 'updatedAt'> {}

// 分期付款详情接口
export interface IInstallment {
  uid: number;
  plan_id: number;
  planId?: number;
  installment_amount: number;
  installmentAmount?: number;
  current_installment: number;
  currentInstallment?: number;
  total_installments: number;
  totalInstallments?: number;
  due_date: Date | string;
  dueDate?: Date | string;
  status: InstallmentStatus;
  paid_amount: number;
  paidAmount?: number;
  paid_at: Date | string | null;
  paidAt?: Date | string | null;
  student_id: number | null;
  studentId?: number | null;
  cash_uid: number | null;
  cashUid?: number | null;
  is_overdue?: boolean;
  isOverdue?: boolean;
  days_overdue?: number;
  daysOverdue?: number;
  remaining_amount?: number;
  remainingAmount?: number;
  created_at: Date | string;
  createdAt?: Date;
  updated_at: Date | string;
  updatedAt?: Date;
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