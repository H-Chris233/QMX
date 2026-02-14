/**
 * 表单验证工具
 * 提供学员和交易表单的验证功能
 */

import {
  ClassType,
  PaymentFrequency,
  SubjectType,
  type CurrentStudentInput
} from '../types/api';
import type { TransactionFormModel } from '../types/forms';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors?: Record<string, string>;
}

/**
 * 验证规则接口
 */
interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
  field?: string;
}

// ==================== 通用验证器 ====================

/**
 * 验证手机号格式（中国大陆）
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  // 支持 11 位手机号，可选 +86 或 86 前缀
  return /^(?:\+?86)?1[3-9]\d{9}$/.test(trimmed.replace(/[\s-]/g, ''));
}

/**
 * 验证是否为非空字符串
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 验证是否为有效数字
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 验证是否为正数
 */
export function isPositiveNumber(value: unknown): boolean {
  return isValidNumber(value) && value > 0;
}

/**
 * 验证是否为非负数
 */
export function isNonNegativeNumber(value: unknown): boolean {
  return isValidNumber(value) && value >= 0;
}

/**
 * 验证是否为有效日期字符串
 */
export function isValidDateString(value: unknown): boolean {
  if (typeof value !== 'string' || !value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

// ==================== 学员表单验证 ====================

/**
 * 学员表单验证规则
 */
const studentValidationRules: ValidationRule<Partial<CurrentStudentInput>>[] = [
  {
    validate: (data) => isNonEmptyString(data.name),
    message: '姓名不能为空',
    field: 'name'
  },
  {
    validate: (data) => {
      if (!data.name) return true; // 已由上一条规则处理
      const name = data.name.trim();
      return name.length >= 2 && name.length <= 50;
    },
    message: '姓名长度应在 2-50 个字符之间',
    field: 'name'
  },
  {
    validate: (data) => {
      // 手机号可选，但如果填写了必须格式正确
      if (!data.phone || data.phone.trim() === '') return true;
      return isValidPhone(data.phone);
    },
    message: '手机号格式不正确',
    field: 'phone'
  },
  {
    validate: (data) => {
      // 年龄可选，但如果填写了必须在合理范围内
      if (data.age === null || data.age === undefined) return true;
      return isValidNumber(data.age) && data.age >= 3 && data.age <= 120;
    },
    message: '年龄应在 3-120 岁之间',
    field: 'age'
  },
  {
    validate: (data) => {
      // 班级类型必填
      if (!data.class) return false;
      const validClasses = Object.values(ClassType);
      return validClasses.includes(String(data.class).trim() as ClassType);
    },
    message: '请选择有效的班级类型',
    field: 'class'
  },
  {
    validate: (data) => {
      // 科目类型必填
      if (!data.subject) return false;
      const validSubjects = Object.values(SubjectType);
      return validSubjects.includes(String(data.subject).trim() as SubjectType);
    },
    message: '请选择有效的科目类型',
    field: 'subject'
  },
  {
    validate: (data) => {
      // 剩余课程数可选，但如果填写了必须为非负数
      if (data.lesson_left === null || data.lesson_left === undefined) return true;
      return isNonNegativeNumber(data.lesson_left);
    },
    message: '剩余课程数不能为负数',
    field: 'lesson_left'
  },
  {
    validate: (data) => {
      // 备注可选，但长度限制
      if (!data.note) return true;
      return data.note.length <= 500;
    },
    message: '备注长度不能超过 500 个字符',
    field: 'note'
  }
];

/**
 * 验证学员表单数据
 * @param data - 学员表单数据
 * @returns 验证结果
 */
export function validateStudentForm(data: unknown): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  // 类型检查
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['表单数据无效'],
      fieldErrors: {}
    };
  }

  const formData = data as Partial<CurrentStudentInput>;

  // 执行所有验证规则
  for (const rule of studentValidationRules) {
    if (!rule.validate(formData)) {
      errors.push(rule.message);
      if (rule.field) {
        fieldErrors[rule.field] = rule.message;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors
  };
}

// ==================== 交易表单验证 ====================

/**
 * 交易表单验证规则
 */
const transactionValidationRules: ValidationRule<Partial<TransactionFormModel>>[] = [
  {
    validate: (data) => {
      // 金额必须大于 0
      return isPositiveNumber(data.amount);
    },
    message: '金额必须大于 0',
    field: 'amount'
  },
  {
    validate: (data) => {
      // 金额不能超过合理范围（100万）
      if (!isValidNumber(data.amount)) return true; // 已由上一条规则处理
      return data.amount <= 1000000;
    },
    message: '金额不能超过 100 万',
    field: 'amount'
  },
  {
    validate: (data) => {
      // 学员 ID 可选（支出可能不关联学员）
      if (data.student_id === null || data.student_id === undefined) return true;
      return isValidNumber(data.student_id) && data.student_id > 0;
    },
    message: '学员 ID 无效',
    field: 'student_id'
  },
  {
    validate: (data) => {
      // 备注长度限制
      if (!data.note) return true;
      return data.note.length <= 500;
    },
    message: '备注长度不能超过 500 个字符',
    field: 'note'
  },
  // 分期相关验证
  {
    validate: (data) => {
      // 如果是分期，必须填写分期数
      if (!data.is_installment) return true;
      const total = data.total_installments;
      if (total === null || total === undefined) return false;
      return isPositiveNumber(total) &&
             Number.isInteger(total) &&
             total >= 2;
    },
    message: '分期数必须至少为 2 期',
    field: 'total_installments'
  },
  {
    validate: (data) => {
      // 如果是分期，分期数不能超过 36 期
      if (!data.is_installment) return true;
      const total = data.total_installments;
      if (total === null || total === undefined || !isValidNumber(total)) return true; // 已由上一条规则处理
      return total <= 36;
    },
    message: '分期数不能超过 36 期',
    field: 'total_installments'
  },
  {
    validate: (data) => {
      // 如果是分期，必须选择付款频率
      if (!data.is_installment) return true;
      const validFrequencies = Object.values(PaymentFrequency);
      return data.frequency !== null &&
             data.frequency !== undefined &&
             validFrequencies.includes(String(data.frequency).trim() as PaymentFrequency);
    },
    message: '请选择付款频率',
    field: 'frequency'
  },
  {
    validate: (data) => {
      // 如果是自定义频率，必须填写天数
      if (!data.is_installment) return true;
      if (String(data.frequency).trim() !== PaymentFrequency.CUSTOM) return true;
      const days = data.custom_days;
      if (days === null || days === undefined) return false;
      return isPositiveNumber(days) &&
             Number.isInteger(days) &&
             days >= 1 &&
             days <= 365;
    },
    message: '自定义天数应在 1-365 天之间',
    field: 'custom_days'
  },
  {
    validate: (data) => {
      // 如果是分期，到期日期必须有效
      if (!data.is_installment) return true;
      if (!data.due_date) return true; // 可能由后端自动计算
      return isValidDateString(data.due_date);
    },
    message: '到期日期格式不正确',
    field: 'due_date'
  },
  {
    validate: (data) => {
      // 如果是分期，必须关联学员
      if (!data.is_installment) return true;
      return data.student_id !== null &&
             data.student_id !== undefined &&
             isValidNumber(data.student_id) &&
             data.student_id > 0;
    },
    message: '分期付款必须关联学员',
    field: 'student_id'
  }
];

/**
 * 验证交易表单数据
 * @param data - 交易表单数据
 * @returns 验证结果
 */
export function validateTransactionForm(data: unknown): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  // 类型检查
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['表单数据无效'],
      fieldErrors: {}
    };
  }

  const formData = data as Partial<TransactionFormModel>;

  // 执行所有验证规则
  for (const rule of transactionValidationRules) {
    if (!rule.validate(formData)) {
      errors.push(rule.message);
      if (rule.field && !fieldErrors[rule.field]) {
        // 每个字段只记录第一个错误
        fieldErrors[rule.field] = rule.message;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors
  };
}

// ==================== 快速验证辅助函数 ====================

/**
 * 快速验证学员姓名
 */
export function validateStudentName(name: string): string | null {
  if (!isNonEmptyString(name)) {
    return '姓名不能为空';
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return '姓名长度应在 2-50 个字符之间';
  }
  return null;
}

/**
 * 快速验证手机号
 */
export function validatePhone(phone: string): string | null {
  if (!phone || phone.trim() === '') {
    return null; // 手机号可选
  }
  if (!isValidPhone(phone)) {
    return '手机号格式不正确';
  }
  return null;
}

/**
 * 快速验证金额
 */
export function validateAmount(amount: number): string | null {
  if (!isPositiveNumber(amount)) {
    return '金额必须大于 0';
  }
  if (amount > 1000000) {
    return '金额不能超过 100 万';
  }
  return null;
}
