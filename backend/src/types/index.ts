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

// 交易记录接口
export interface ICash {
  uid: number;
  student_id: number | null;
  cash: number;
  note: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

// 交易创建属性
export interface ICashCreationAttributes extends Omit<ICash, 'uid' | 'createdAt' | 'updatedAt'> {}

// 分期付款计划接口
export interface IInstallmentPlan {
  plan_id: number;
  total_amount: number;
  total_installments: number;
  frequency: PaymentFrequency;
  custom_days?: number | null;
  student_id?: number | null; // 添加学员ID关联
  createdAt: Date;
  updatedAt?: Date;
}

// 分期付款创建属性
export interface IInstallmentPlanCreationAttributes extends Omit<IInstallmentPlan, 'plan_id' | 'createdAt' | 'updatedAt'> {}

// 分期付款详情接口
export interface IInstallment {
  uid: number;
  plan_id: number;
  total_amount: number;
  total_installments: number;
  current_installment: number;
  frequency: PaymentFrequency;
  custom_days?: number | null;
  due_date: Date;
  status: InstallmentStatus;
  createdAt: Date;
  updatedAt?: Date;
}

// 分期付款创建属性
export interface IInstallmentCreationAttributes extends Omit<IInstallment, 'uid' | 'createdAt' | 'updatedAt'> {}

// 统计数据接口
export interface IDashboardStats {
  total_students: number;
  total_revenue: number;
  total_expense: number;
  average_score: number;
  max_score: number;
  active_courses: number;
}

// 学员统计数据
export interface IStudentStats {
  total_payments: number;
  payment_count: number;
  average_score?: number;
  score_count: number;
  membership_status: string;
}

// 财务统计数据
export interface IFinancialStats {
  total_income: number;
  total_expense: number;
  net_income: number;
  net_profit?: number;
  is_profitable?: boolean;
  installment_total: number;
  installment_paid: number;
  installment_pending: number;
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
  student_id?: number | null;
  min_amount?: number | null;
  max_amount?: number | null;
  has_installment?: boolean | null;
  date_from?: Date | null;
  date_to?: Date | null;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

// API响应接口
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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