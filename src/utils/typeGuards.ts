import type { Student, Transaction, DashboardStats, InstallmentStatus, ValidationResult } from '../types/api';

export function isStudent(obj: unknown): obj is Student {
  if (!obj || typeof obj !== 'object') return false;
  const student = obj as Record<string, unknown>;
  
  return (
    typeof student.uid === 'number' &&
    typeof student.name === 'string' &&
    (typeof student.age === 'number' || student.age === null) &&
    typeof student.class === 'string' &&
    typeof student.phone === 'string' &&
    Array.isArray(student.rings) &&
    student.rings.every(ring => typeof ring === 'number') &&
    (typeof student.note === 'string' || student.note === null) &&
    typeof student.cash === 'string' &&
    typeof student.subject === 'string' &&
    (typeof student.lesson_left === 'number' || student.lesson_left === null) &&
    (typeof student.membership_start_date === 'string' || student.membership_start_date === null) &&
    (typeof student.membership_end_date === 'string' || student.membership_end_date === null) &&
    typeof student.is_membership_active === 'boolean' &&
    (typeof student.membership_days_remaining === 'number' || student.membership_days_remaining === null)
  );
}

export function isTransaction(obj: unknown): obj is Transaction {
  if (!obj || typeof obj !== 'object') return false;
  const transaction = obj as Record<string, unknown>;
  
  const basicValidation = (
    typeof transaction.uid === 'number' &&
    (typeof transaction.student_id === 'number' || transaction.student_id === null) &&
    typeof transaction.amount === 'number' &&
    typeof transaction.description === 'string' &&
    (typeof transaction.note === 'string' || transaction.note === null) &&
    typeof transaction.is_installment === 'boolean'
  );
  
  if (!basicValidation) return false;
  
  if (transaction.is_installment) {
    return (
      typeof transaction.installment_plan_id === 'number' &&
      typeof transaction.installment_current === 'number' &&
      typeof transaction.installment_total === 'number' &&
      (typeof transaction.installment_due_date === 'string' || transaction.installment_due_date === null) &&
      (isInstallmentStatus(transaction.installment_status) || transaction.installment_status === null)
    );
  }
  
  return true;
}

export function isDashboardStats(obj: unknown): obj is DashboardStats {
  if (!obj || typeof obj !== 'object') return false;
  const stats = obj as Record<string, unknown>;
  
  return (
    typeof stats.total_students === 'number' &&
    typeof stats.total_revenue === 'number' &&
    typeof stats.total_expense === 'number' &&
    typeof stats.average_score === 'number' &&
    typeof stats.max_score === 'number' &&
    typeof stats.active_courses === 'number'
  );
}

export function isInstallmentStatus(value: unknown): value is InstallmentStatus {
  return typeof value === 'string' && 
    ['Pending', 'Paid', 'Overdue', 'Cancelled'].includes(value);
}

export function validateStudent(obj: unknown): ValidationResult<Student> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, errors: ['输入不是有效对象'] };
  }
  
  const student = obj as Record<string, unknown>;
  
  if (typeof student.uid !== 'number') errors.push('uid必须是数字');
  if (typeof student.name !== 'string') errors.push('姓名必须是字符串');
  if (typeof student.age !== 'number' && student.age !== null) errors.push('年龄必须是数字或null');
  if (typeof student.class !== 'string') errors.push('班级必须是字符串');
  if (typeof student.phone !== 'string') errors.push('电话必须是字符串');
  if (!Array.isArray(student.rings)) errors.push('成绩必须是数组');
  if (typeof student.note !== 'string' && student.note !== null) errors.push('备注必须是字符串或null');
  if (typeof student.cash !== 'string') errors.push('现金必须是字符串');
  if (typeof student.subject !== 'string') errors.push('科目必须是字符串');
  if (typeof student.lesson_left !== 'number' && student.lesson_left !== null) errors.push('剩余课程数必须是数字或null');
  if (typeof student.membership_start_date !== 'string' && student.membership_start_date !== null) errors.push('会员开始日期必须是字符串或null');
  if (typeof student.membership_end_date !== 'string' && student.membership_end_date !== null) errors.push('会员结束日期必须是字符串或null');
  if (typeof student.is_membership_active !== 'boolean') errors.push('会员激活状态必须是布尔值');
  if (typeof student.membership_days_remaining !== 'number' && student.membership_days_remaining !== null) errors.push('会员剩余天数必须是数字或null');
  
  if (errors.length === 0) {
    // 创建一个新的Student对象，确保所有必需字段都存在
    const validStudent: Student = {
      uid: student.uid as number,
      name: student.name as string,
      age: student.age as number | null,
      class: student.class as string,
      phone: student.phone as string,
      rings: student.rings as number[],
      note: student.note as string | null,
      cash: student.cash as string,
      subject: student.subject as string,
      lesson_left: student.lesson_left as number | null,
      membership_start_date: student.membership_start_date as string | null,
      membership_end_date: student.membership_end_date as string | null,
      is_membership_active: student.is_membership_active as boolean,
      membership_days_remaining: student.membership_days_remaining as number | null,
    };
    
    return { isValid: true, data: validStudent, errors: [] };
  }
  
  return { isValid: false, errors };
}

export function validateTransaction(obj: unknown): ValidationResult<Transaction> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, errors: ['输入不是有效对象'] };
  }
  
  const transaction = obj as Record<string, unknown>;
  
  if (typeof transaction.uid !== 'number') errors.push('uid必须是数字');
  if (typeof transaction.student_id !== 'number' && transaction.student_id !== null) {
    errors.push('student_id必须是数字或null');
  }
  if (typeof transaction.amount !== 'number') errors.push('金额必须是数字');
  if (typeof transaction.description !== 'string') errors.push('描述必须是字符串');
  if (typeof transaction.note !== 'string' && transaction.note !== null) errors.push('备注必须是字符串或null');
  if (typeof transaction.is_installment !== 'boolean') errors.push('is_installment必须是布尔值');
  
  if (transaction.is_installment) {
    if (typeof transaction.installment_plan_id !== 'number' && transaction.installment_plan_id !== null) {
      errors.push('分期计划ID必须是数字或null');
    }
    if (typeof transaction.installment_current !== 'number' && transaction.installment_current !== null) {
      errors.push('当前分期必须是数字或null');
    }
    if (typeof transaction.installment_total !== 'number' && transaction.installment_total !== null) {
      errors.push('总分期数必须是数字或null');
    }
    if (typeof transaction.installment_due_date !== 'string' && transaction.installment_due_date !== null) {
      errors.push('分期付款到期日期必须是字符串或null');
    }
    if (!isInstallmentStatus(transaction.installment_status) && transaction.installment_status !== null) {
      errors.push('分期付款状态必须是有效的状态或null');
    }
  }
  
  if (errors.length === 0) {
    // 创建一个新的Transaction对象，确保所有必需字段都存在
    const validTransaction: Transaction = {
      uid: transaction.uid as number,
      student_id: transaction.student_id as number | null,
      amount: transaction.amount as number,
      description: transaction.description as string,
      note: transaction.note as string | null,
      is_installment: transaction.is_installment as boolean,
      installment_plan_id: transaction.installment_plan_id as number | null,
      installment_current: transaction.installment_current as number | null,
      installment_total: transaction.installment_total as number | null,
      installment_due_date: transaction.installment_due_date as string | null,
      installment_status: isInstallmentStatus(transaction.installment_status) ? transaction.installment_status as InstallmentStatus : null,
    };
    
    return { isValid: true, data: validTransaction, errors: [] };
  }
  
  return { isValid: false, errors };
}

export function assertIsStudent(obj: unknown): asserts obj is Student {
  if (!isStudent(obj)) {
    throw new Error('对象不是有效的Student类型');
  }
}

export function assertIsTransaction(obj: unknown): asserts obj is Transaction {
  if (!isTransaction(obj)) {
    throw new Error('对象不是有效的Transaction类型');
  }
}

export function assertIsDashboardStats(obj: unknown): asserts obj is DashboardStats {
  if (!isDashboardStats(obj)) {
    throw new Error('对象不是有效的DashboardStats类型');
  }
}