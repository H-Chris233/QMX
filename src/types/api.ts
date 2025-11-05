/**
 * QMX 前端 API 类型定义
 * 与后端 TypeScript 类型保持同步
 */

// ============================================================================
// 枚举类型（与后端保持一致）
// ============================================================================

/**
 * 班级类型枚举
 */
export enum ClassType {
  TEN_TRY = 'TenTry',
  MONTH = 'Month',
  YEAR = 'Year',
  OTHERS = 'Others',
}

/**
 * 科目类型枚举
 */
export enum SubjectType {
  SHOOTING = 'Shooting',
  ARCHERY = 'Archery',
  OTHERS = 'Others',
}

/**
 * 会员状态枚举
 */
export enum MembershipStatus {
  NONE = 'None',
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  UPCOMING = 'Upcoming',
}

/**
 * 分期付款状态枚举
 */
export enum InstallmentStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  CANCELLED = 'Cancelled',
}

/**
 * 付款频率枚举
 */
export enum PaymentFrequency {
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
  QUARTERLY = 'Quarterly',
  CUSTOM = 'Custom',
}

/**
 * 分期计划状态枚举
 */
export enum InstallmentPlanStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

// ============================================================================
// API 响应包装类型
// ============================================================================

/**
 * API 错误负载
 */
export interface ApiErrorPayload {
  /** 错误信息 */
  error: string;
  /** 详细错误消息（可选） */
  message?: string;
  /** 错误详情（可选） */
  details?: unknown;
}

/**
 * API 响应基础结构
 * @template T - 响应数据的类型
 */
export interface ApiResponse<T> {
  /** 请求是否成功 */
  success: boolean;
  /** 响应数据（成功时） */
  data?: T;
  /** 错误信息（失败时） */
  error?: string;
  /** 附加消息（可选） */
  message?: string;
}

/**
 * 分页数据结构
 * @template T - 数据项的类型
 */
export interface PaginatedData<T> {
  /** 数据列表 */
  data: T[];
  /** 分页信息 */
  pagination: {
    /** 当前页码 */
    page: number;
    /** 每页条数 */
    limit: number;
    /** 总记录数 */
    total: number;
    /** 总页数 */
    total_pages: number;
  };
}

/**
 * 分页响应（带 success 标志）
 * @template T - 数据项的类型
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** 响应数据 */
  data: T[];
  /** 分页信息 */
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ============================================================================
// 学员相关类型
// ============================================================================

/**
 * 学员信息接口
 * 注意：后端使用 `rings` 存储成绩数组
 */
export interface Student {
  /** 学员唯一标识符 */
  uid: number;
  /** 学员姓名 */
  name: string;
  /** 学员年龄 */
  age: number | null;
  /** 班级类型 */
  class: ClassType | string;
  /** 联系电话 */
  phone: string;
  /** 成绩数组（后端字段名为 rings） */
  rings: number[];
  /** 备注信息 */
  note: string | null;
  /** 科目类型 */
  subject: SubjectType | string;
  /** 剩余课程数 */
  lesson_left: number | null;
  /** 会员开始日期（ISO 格式字符串） */
  membership_start_date: string | null;
  /** 会员结束日期（ISO 格式字符串） */
  membership_end_date: string | null;
  /** 会员是否激活 */
  is_membership_active: boolean;
  /** 会员剩余天数 */
  membership_days_remaining: number | null;
  /** 会员状态 */
  membership_status?: MembershipStatus;
  /** 创建时间（可选） */
  created_at?: string;
  /** 更新时间（可选） */
  updated_at?: string;
}

/**
 * 学员成绩兼容类型
 * 提供 scores 属性的向后兼容
 */
export type StudentScores = Student & {
  /** 成绩数组（兼容旧代码，指向 rings） */
  readonly scores: number[];
};

/**
 * 将 Student 转换为带 scores 属性的兼容类型
 */
export function withScoresCompat(student: Student): StudentScores {
  return {
    ...student,
    get scores() {
      return student.rings;
    },
  };
}

/**
 * 学员信息更新数据接口
 * 用于 PATCH/PUT 请求
 */
export interface StudentUpdateData {
  /** 学员姓名 */
  name?: string;
  /** 学员年龄 */
  age?: number | null;
  /** 班级类型 */
  class?: ClassType | string;
  /** 联系电话 */
  phone?: string;
  /** 备注信息 */
  note?: string;
  /** 科目类型 */
  subject?: SubjectType | string;
  /** 剩余课程数 */
  lesson_left?: number | null;
  /** 会员开始日期 */
  membership_start_date?: string | null;
  /** 会员结束日期 */
  membership_end_date?: string | null;
  /** 成绩数组 */
  rings?: number[];
}

/**
 * 学员批量更新数据接口
 * 用于批量更新学员信息，不包含会员相关信息
 */
export interface StudentUpdateBatch {
  /** 学员姓名 */
  name?: string;
  /** 学员年龄 */
  age?: number | null;
  /** 班级类型 */
  class_type?: ClassType | string;
  /** 科目类型 */
  subject?: SubjectType | string;
  /** 备注信息 */
  note?: string;
}

/**
 * 学员搜索选项接口
 */
export interface StudentSearchOptions {
  /** 姓名包含 */
  name_contains?: string | null | undefined;
  /** 最小年龄 */
  min_age?: number | null | undefined;
  /** 最大年龄 */
  max_age?: number | null | undefined;
  /** 最低分 */
  min_score?: number | null | undefined;
  /** 最高分 */
  max_score?: number | null | undefined;
  /** 班级类型 */
  class_type?: ClassType | string | null | undefined;
  /** 科目 */
  subject?: SubjectType | string | null | undefined;
  /** 是否有会员 */
  has_membership?: boolean | null | undefined;
  /** 会员在指定日期是否激活 */
  membership_active_at?: string | null | undefined;
  /** 会员状态 */
  membership_status?: MembershipStatus | null | undefined;
  /** 页码 */
  page?: number;
  /** 每页条数 */
  limit?: number;
  /** 排序字段 */
  sort_by?: string;
  /** 排序方向 */
  sort_order?: 'ASC' | 'DESC';
}

/**
 * 学员成绩响应接口
 */
export interface StudentScoresResponse {
  /** 成绩数组 */
  rings: number[];
  /** 兼容旧代码的 scores 别名 */
  scores?: number[];
}

/**
 * 学员统计数据接口
 */
export interface StudentStats {
  /** 总支付金额（单位：元） */
  total_payments: number;
  /** 支付次数 */
  payment_count: number;
  /** 平均分 */
  average_score?: number;
  /** 最高分 */
  max_score?: number;
  /** 最低分 */
  min_score?: number;
  /** 成绩次数 */
  score_count: number;
  /** 会员状态文本 */
  membership_status: string;
  /** 会员状态代码 */
  membership_status_code?: MembershipStatus;
  /** 会员是否处于激活状态 */
  membership_is_active?: boolean;
  /** 会员剩余天数 */
  membership_days_remaining?: number | null;
  /** 会员距离开始的天数 */
  membership_days_until_start?: number | null;
  /** 分期付款统计 */
  installment_stats?: {
    /** 分期总金额（单位：元） */
    total_amount: number;
    /** 已支付金额（单位：元） */
    paid_amount: number;
    /** 待支付金额（单位：元） */
    pending_amount?: number;
    /** 待支付期数 */
    pending_count: number;
    /** 剩余金额（单位：元） */
    remaining_amount: number;
  };
}

// ============================================================================
// 交易相关类型
// ============================================================================

/**
 * 交易信息接口
 * 注意：金额单位为"元"（后端存储为分/cents，返回时已转换为元）
 */
export interface Transaction {
  /** 交易唯一标识符 */
  uid: number;
  /** 关联的学员ID */
  student_id: number | null;
  /** 交易金额（单位：元，正数表示收入，负数表示支出） */
  amount: number;
  /** 格式化的金额字符串（包含符号和单位，如 "+123.45 元"） */
  formatted_amount?: string;
  /** 交易描述 */
  description?: string;
  /** 备注信息 */
  note: string | null;
  /** 是否为收入 */
  is_income?: boolean;
  /** 是否为支出 */
  is_expense?: boolean;
  /** 是否为分期付款 */
  is_installment?: boolean;
  /** 分期付款信息快照 */
  installment?: {
    /** 分期计划ID */
    plan_uid: number;
    /** 分期付款ID */
    installment_uid?: number | null;
    /** 当前分期号 */
    installment_number?: number | null;
    /** 总分期数 */
    total_installments?: number | null;
    /** 到期日期 */
    due_date?: string | null;
    /** 分期状态 */
    status?: InstallmentStatus | string | null;
    /** 备注 */
    note?: string | null;
  } | null;
  /** 关联的学员信息（可选） */
  student?: Record<string, unknown> | null;
  /** 创建时间（ISO 格式字符串） */
  created_at?: string;
  /** 更新时间（ISO 格式字符串） */
  updated_at?: string;
}

/**
 * 交易创建数据接口
 */
export interface TransactionCreateData {
  /** 关联的学员ID */
  student_id?: number | null;
  /** 交易金额（单位：元） */
  amount: number;
  /** 备注信息 */
  note?: string | null;
  /** 分期付款信息快照 */
  installment?: {
    plan_uid: number;
    installment_uid?: number | null;
    installment_number?: number | null;
    total_installments?: number | null;
    due_date?: string | null;
    status?: InstallmentStatus | string | null;
    note?: string | null;
  } | null;
}

/**
 * 现金/交易搜索选项接口
 */
export interface CashSearchOptions {
  /** 学员ID */
  student_id?: number | null | undefined;
  /** 最小金额（单位：元） */
  min_amount?: number | null | undefined;
  /** 最大金额（单位：元） */
  max_amount?: number | null | undefined;
  /** 是否有分期付款 */
  has_installment?: boolean | null | undefined;
  /** 开始日期 */
  date_from?: string | null | undefined;
  /** 结束日期 */
  date_to?: string | null | undefined;
  /** 是否为收入 */
  is_income?: boolean | null | undefined;
  /** 页码 */
  page?: number;
  /** 每页条数 */
  limit?: number;
  /** 排序字段 */
  sort_by?: 'uid' | 'student_id' | 'cash' | 'created_at' | 'updated_at';
  /** 排序方向 */
  sort_order?: 'ASC' | 'DESC';
}

// ============================================================================
// 分期付款相关类型
// ============================================================================

/**
 * 分期付款计划接口
 */
export interface InstallmentPlan {
  /** 分期计划唯一标识符 */
  uid: number;
  /** 关联的学员ID */
  student_id: number | null;
  /** 总金额（单位：元） */
  total_amount: number;
  /** 总分期数 */
  total_installments: number;
  /** 付款频率 */
  frequency: PaymentFrequency;
  /** 自定义天数（当频率为 Custom 时使用） */
  custom_days?: number | null;
  /** 开始日期（ISO 格式字符串） */
  start_date: string;
  /** 计划状态 */
  status: InstallmentPlanStatus;
  /** 备注 */
  note?: string | null;
  /** 创建时间 */
  created_at?: string;
  /** 更新时间 */
  updated_at?: string;
}

/**
 * 分期付款详情接口
 */
export interface Installment {
  /** 分期付款唯一标识符 */
  uid: number;
  /** 分期计划ID */
  plan_id: number;
  /** 分期金额（单位：元） */
  installment_amount: number;
  /** 当前分期号 */
  current_installment: number;
  /** 总分期数 */
  total_installments: number;
  /** 到期日期（ISO 格式字符串） */
  due_date: string;
  /** 分期状态 */
  status: InstallmentStatus;
  /** 已支付金额（单位：元） */
  paid_amount: number;
  /** 支付时间（ISO 格式字符串，null 表示未支付） */
  paid_at: string | null;
  /** 关联的学员ID */
  student_id: number | null;
  /** 关联的交易记录ID */
  cash_uid: number | null;
  /** 是否逾期 */
  is_overdue?: boolean;
  /** 逾期天数 */
  days_overdue?: number;
  /** 剩余金额（单位：元） */
  remaining_amount?: number;
  /** 创建时间 */
  created_at?: string;
  /** 更新时间 */
  updated_at?: string;
}

// ============================================================================
// 统计数据类型
// ============================================================================

/**
 * 仪表板统计数据接口
 * 所有金额单位为"元"
 */
export interface DashboardStats {
  /** 总学员数 */
  total_students: number;
  /** 总收入（单位：元） */
  total_revenue: number;
  /** 总支出（单位：元） */
  total_expense: number;
  /** 净收入（单位：元） */
  net_income: number;
  /** 平均分 */
  average_score: number;
  /** 最高分 */
  max_score: number;
  /** 活跃课程数 */
  active_courses: number;
  /** 活跃会员数 */
  active_members?: number;
  /** 活跃分期计划数 */
  active_installments?: number;
  /** 逾期分期数量 */
  overdue_installments?: number;
}

/**
 * 财务统计数据接口
 * 所有金额单位为"元"
 */
export interface FinancialStats {
  /** 统计周期 */
  period?: string;
  /** 起始日期（ISO 格式字符串） */
  date_from?: string;
  /** 截止日期（ISO 格式字符串） */
  date_to?: string;
  /** 总收入（单位：元） */
  total_income: number;
  /** 总支出（单位：元） */
  total_expense: number;
  /** 净收入（单位：元） */
  net_income: number;
  /** 净利润（单位：元） */
  net_profit?: number;
  /** 是否盈利 */
  is_profitable?: boolean;
  /** 分期总金额（单位：元） */
  installment_total: number;
  /** 已支付分期金额（单位：元） */
  installment_paid: number;
  /** 待支付分期金额（单位：元） */
  installment_pending: number;
  /** 剩余分期金额（单位：元） */
  installment_remaining?: number;
  /** 交易数量 */
  transaction_count?: number;
  /** 学员收入榜 */
  student_income?: Array<{
    student_id: number;
    student_name: string;
    /** 金额（单位：元） */
    amount: number;
  }>;
}

// ============================================================================
// 会员相关类型
// ============================================================================

/**
 * 会员数据接口
 */
export interface MembershipData {
  /** 会员开始日期（ISO 格式字符串） */
  startDate: string | null;
  /** 会员结束日期（ISO 格式字符串） */
  endDate: string | null;
}

/**
 * 会员类型
 * month: 月卡
 * year: 年卡
 */
export type MembershipType = 'month' | 'year';

/**
 * 会员信息接口
 */
export interface MembershipInfo {
  /** 会员是否激活 */
  isActive: boolean;
  /** 会员开始日期（ISO 格式字符串） */
  startDate: string | null;
  /** 会员结束日期（ISO 格式字符串） */
  endDate: string | null;
  /** 会员剩余天数 */
  daysRemaining: number | null;
  /** 会员类型 */
  type: MembershipType | null;
}

// ============================================================================
// 表单输入类型
// ============================================================================

/**
 * 当前学生接口 - 用于表单数据
 * 注意：classType 为驼峰命名，用于前端表单绑定
 */
export interface CurrentStudent {
  /** 学员唯一标识符 - null表示新增 */
  uid: number | null;
  /** 学员姓名 */
  name: string;
  /** 学员年龄 */
  age: number | null;
  /** 联系电话 */
  phone: string;
  /** 班级类型（驼峰命名） */
  classType: string;
  /** 备注信息 */
  note: string;
  /** 科目类型 */
  subject: string;
  /** 自定义会员开始时间 */
  customMembershipStart: string;
  /** 是否启用自定义会员时间 */
  enableCustomMembership: boolean;
}

/**
 * 学员输入数据类型（用于创建/更新）
 * 区分表单字段（classType）与后端 payload（class）
 */
export interface CurrentStudentInput {
  /** 学员姓名 */
  name: string;
  /** 学员年龄 */
  age: number | null;
  /** 联系电话 */
  phone: string;
  /** 班级类型 */
  class: ClassType | string;
  /** 备注信息 */
  note?: string | undefined;
  /** 科目类型 */
  subject: SubjectType | string;
  /** 剩余课程数 */
  lesson_left?: number | null | undefined;
  /** 会员开始日期 */
  membership_start_date?: string | null | undefined;
  /** 会员结束日期 */
  membership_end_date?: string | null | undefined;
}

// ============================================================================
// 验证相关类型
// ============================================================================

/**
 * 验证结果接口
 * @template T - 验证数据的类型
 */
export interface ValidationResult<T> {
  /** 是否有效 */
  isValid: boolean;
  /** 验证通过的数据 */
  data?: T;
  /** 错误信息数组 */
  errors: string[];
}

// ============================================================================
// API 端点类型
// ============================================================================

/**
 * API端点类型
 * 定义了所有可用的API端点
 */
export type ApiEndpoint =
  | '/students'
  | '/students/search'
  | '/students/:id'
  | '/students/:id/scores'
  | '/students/:id/scores/:scoreIndex'
  | '/students/:id/scores/batch'
  | '/transactions'
  | '/transactions/search'
  | '/transactions/:id'
  | '/transactions/installment'
  | '/installments/statuses'
  | '/installments/upcoming'
  | '/installments/:transactionUid/status'
  | '/installments/:planId/next'
  | '/installments/:planId/cancel'
  | '/installments/:planId'
  | '/dashboard/stats'
  | '/dashboard/financial-stats'
  | '/dashboard/global-student-stats'
  | '/dashboard/global-financial-stats'
  | '/dashboard/membership-expiring'
  | '/dashboard/students/:id/stats'
  | '/membership/stats'
  | '/membership/batch'
  | '/membership/students/:id/membership'
  | '/membership/students/:id/membership/type'
  | '/membership/students/:id/membership/renew';

// ============================================================================
// 向后兼容的类型别名（已废弃，保留以避免破坏性变更）
// ============================================================================

/**
 * @deprecated 使用 InstallmentStatus 枚举替代
 */
export type InstallmentStatusLegacy = 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';

/**
 * @deprecated 使用 PaginatedResponse<T> 替代
 */
export interface PaginatedResponseLegacy<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
