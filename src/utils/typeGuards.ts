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
    (typeof transaction.note === 'string' || transaction.note === null)
  );
  
  if (!basicValidation) return false;
  
  if (transaction.is_installment && transaction.installment) {
    const installment = transaction.installment as Record<string, unknown>;
    return (
      typeof installment.plan_uid === 'number'
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
  if (typeof transaction.note !== 'string' && transaction.note !== null) errors.push('备注必须是字符串或null');
  
  if (errors.length === 0) {
    // 创建一个新的Transaction对象，确保所有必需字段都存在
    const validTransaction: any = {
      uid: transaction.uid as number,
      student_id: transaction.student_id as number | null,
      amount: transaction.amount as number,
      note: transaction.note as string | null,
    };
    if (transaction.description !== undefined) {
      validTransaction.description = transaction.description as string;
    }
    if (transaction.is_installment !== undefined) {
      validTransaction.is_installment = transaction.is_installment as boolean;
    }
    if (transaction.installment !== undefined) {
      validTransaction.installment = transaction.installment;
    }
    
    return { isValid: true, data: validTransaction as Transaction, errors: [] };
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