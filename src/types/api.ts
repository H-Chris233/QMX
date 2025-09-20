/**
 * 学员信息接口
 */
export interface Student {
  /** 学员唯一标识符 */
  uid: number;
  /** 学员姓名 */
  name: string;
  /** 学员年龄 */
  age: number | null;
  /** 班级类型 */
  class: string;
  /** 联系电话 */
  phone: string;
  /** 成绩数组 */
  rings: number[];
  /** 备注信息 */
  note: string | null;
  /** 现金信息 */
  cash: string;
  /** 科目类型 */
  subject: string;
  /** 剩余课程数 */
  lesson_left: number | null;
  /** 会员开始日期 */
  membership_start_date: string | null;
  /** 会员结束日期 */
  membership_end_date: string | null;
  /** 会员是否激活 */
  is_membership_active: boolean;
  /** 会员剩余天数 */
  membership_days_remaining: number | null;
}

/**
 * 交易信息接口
 */
export interface Transaction {
  /** 交易唯一标识符 */
  uid: number;
  /** 关联的学员ID */
  student_id: number | null;
  /** 交易金额 */
  amount: number;
  /** 交易描述 */
  description: string;
  /** 备注信息 */
  note: string | null;
  /** 是否为分期付款 */
  is_installment: boolean;
  /** 分期计划ID */
  installment_plan_id: number | null;
  /** 当前分期 */
  installment_current: number | null;
  /** 总分期数 */
  installment_total: number | null;
  /** 分期付款到期日期 */
  installment_due_date: string | null;
  /** 分期付款状态 */
  installment_status: InstallmentStatus | null;
}

/**
 * 仪表板统计数据接口
 */
export interface DashboardStats {
  /** 总学员数 */
  total_students: number;
  /** 总收入 */
  total_revenue: number;
  /** 总支出 */
  total_expense: number;
  /** 平均分 */
  average_score: number;
  /** 最高分 */
  max_score: number;
  /** 活跃课程数 */
  active_courses: number;
}

/**
 * 分期付款状态类型
 * Pending: 待处理
 * Paid: 已支付
 * Overdue: 逾期
 * Cancelled: 已取消
 */
export type InstallmentStatus = 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';

/**
 * 学员信息更新数据接口
 */
export interface StudentUpdateData {
  /** 学员姓名 */
  name?: string;
  /** 学员年龄 */
  age?: number | null;
  /** 班级类型 */
  classType?: string;
  /** 联系电话 */
  phone?: string;
  /** 备注信息 */
  note?: string;
  /** 科目类型 */
  subject?: string;
  /** 剩余课程数 */
  lessonLeft?: number | null;
  /** 会员开始日期 */
  membershipStartDate?: string | null;
  /** 会员结束日期 */
  membershipEndDate?: string | null;
}

/**
 * 会员数据接口
 */
export interface MembershipData {
  /** 会员开始日期 */
  startDate: string | null;
  /** 会员结束日期 */
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
  /** 会员开始日期 */
  startDate: string | null;
  /** 会员结束日期 */
  endDate: string | null;
  /** 会员剩余天数 */
  daysRemaining: number | null;
  /** 会员类型 */
  type: MembershipType | null;
}

/**
 * API响应接口
 * @template T - 响应数据的类型
 */
export interface ApiResponse<T> {
  /** 响应数据 */
  data: T;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

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

// v2 API types
/**
 * 学员统计数据接口
 */
export interface StudentStats {
  /** 总支付金额 */
  total_payments: number;
  /** 支付次数 */
  payment_count: number;
  /** 平均分 */
  average_score?: number;
  /** 成绩次数 */
  score_count: number;
  /** 会员状态 */
  membership_status: string;
}

/**
 * 财务统计数据接口
 */
export interface FinancialStats {
  /** 总收入 */
  total_income: number;
  /** 总支出 */
  total_expense: number;
  /** 净收入 */
  net_income: number;
  /** 净利润 */
  net_profit?: number;
  /** 是否盈利 */
  is_profitable?: boolean;
  /** 总分期数 */
  installment_total: number;
  /** 已支付分期数 */
  installment_paid: number;
  /** 待处理分期数 */
  installment_pending: number;
}

/**
 * 学员搜索选项接口
 */
export interface StudentSearchOptions {
  /** 姓名包含 */
  name_contains?: string | null;
  /** 最小年龄 */
  min_age?: number | null;
  /** 最大年龄 */
  max_age?: number | null;
  /** 最低分 */
  min_score?: number | null;
  /** 最高分 */
  max_score?: number | null;
  /** 班级类型 */
  class_type?: string | null;
  /** 科目 */
  subject?: string | null;
  /** 是否有会员 */
  has_membership?: boolean | null;
}

/**
 * 现金搜索选项接口
 * 用于后端的现金搜索功能
 */
export interface CashSearchOptions {
  /** 学员ID */
  student_id?: number | null;
  /** 最小金额 */
  min_amount?: number | null;
  /** 最大金额 */
  max_amount?: number | null;
  /** 是否有分期付款 */
  has_installment?: boolean | null;
  /** 开始日期 */
  date_from?: string | null;
  /** 结束日期 */
  date_to?: string | null;
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
  class_type?: string;
  /** 科目类型 */
  subject?: string;
  /** 备注信息 */
  note?: string;
}

/**
 * 学员成绩响应接口
 */
export interface StudentScoresResponse {
  /** 成绩数组 */
  rings: number[];
}

/**
 * Tauri命令类型
 * 定义了所有可用的Tauri命令
 */
export type TauriCommand = 
  | 'add_student'
  | 'get_all_students'
  | 'add_score'
  | 'get_student_scores'
  | 'delete_student_score'
  | 'update_student_score'
  | 'update_student_info'
  | 'delete_student'
  | 'add_cash_transaction'
  | 'get_all_transactions'
  | 'delete_cash_transaction'
  | 'update_installment_status'
  | 'generate_next_installment'
  | 'cancel_installment_plan'
  | 'get_installments_by_plan'
  | 'get_dashboard_stats'
  | 'open_main_window'
  | 'set_student_membership'
  | 'clear_student_membership'
  | 'set_membership_by_type'
  // v2 API commands
  | 'get_student_stats'
  | 'get_financial_stats'
  | 'search_students'
  | 'get_student_cash'
  | 'search_cash'
  | 'update_multiple_students'
  | 'get_membership_expiring_soon';