export interface Student {
  uid: number;
  name: string;
  age: number;
  class: string;
  phone: string;
  rings: number[];
  note: string;
  cash: string;
  subject: string;
  lesson_left?: number | undefined;
  membership_start_date?: string | null;
  membership_end_date?: string | null;
  is_membership_active: boolean;
  membership_days_remaining?: number | null;
}

export interface Transaction {
  uid: number;
  student_id: number | null;
  amount: number;
  description: string;
  note: string | null;
  is_installment: boolean;
  installment_plan_id: number | null;
  installment_current: number | null;
  installment_total: number | null;
  installment_due_date: string | null;
  installment_status: InstallmentStatus | null;
}

export interface DashboardStats {
  total_students: number;
  total_revenue: number;
  total_expense: number;
  average_score: number;
  max_score: number;
  active_courses: number;
}

export type InstallmentStatus = 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';

export interface StudentUpdateData {
  name?: string;
  age?: number;
  classType?: string;
  phone?: string;
  note?: string;
  subject?: string;
  lessonLeft?: number;
  membershipStartDate?: string;
  membershipEndDate?: string;
}

export interface MembershipData {
  startDate?: string;
  endDate?: string;
}

export type MembershipType = 'month' | 'year';

export interface MembershipInfo {
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  daysRemaining?: number;
  type?: MembershipType;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

// v2 API types
export interface StudentStats {
  total_payments: number;
  payment_count: number;
  average_score?: number;
  score_count: number;
  membership_status: string;
}

export interface FinancialStats {
  total_income: number;
  total_expense: number;
  net_income: number;
  installment_total: number;
  installment_paid: number;
  installment_pending: number;
}

export interface StudentSearchOptions {
  name_contains?: string;
  min_age?: number;
  max_age?: number;
  class_type?: string;
  subject?: string;
  has_membership?: boolean;
}

export interface CashSearchOptions {
  student_id?: number;
  min_amount?: number;
  max_amount?: number;
  has_installment?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface StudentUpdateBatch {
  name?: string;
  age?: number;
  class_type?: string;
  subject?: string;
  note?: string;
}

export interface StudentScoresResponse {
  rings: number[];
}

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