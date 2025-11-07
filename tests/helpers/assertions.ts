/**
 * 测试断言助手
 * 提供常用的断言工具函数
 */

import { expect } from 'vitest';
import type { ApiResponse } from '@/types/api';

/**
 * 断言API响应成功
 */
export function assertSuccess<T>(response: ApiResponse<T>): asserts response is ApiResponse<T> & { success: true; data: T } {
  expect(response.success).toBe(true);
  expect(response.data).toBeDefined();
  expect(response.error).toBeUndefined();
}

/**
 * 断言API响应失败
 */
export function assertError(response: ApiResponse<any>): asserts response is ApiResponse<never> & { success: false; error: string } {
  expect(response.success).toBe(false);
  expect(response.error).toBeDefined();
  expect(response.error).not.toBe('');
}

/**
 * 断言响应包含指定数据
 */
export function assertResponseData<T>(response: ApiResponse<T>, expectedData: Partial<T>): void {
  assertSuccess(response);
  expect(response.data).toMatchObject(expectedData);
}

/**
 * 断言响应错误消息
 */
export function assertErrorMessage(response: ApiResponse<any>, expectedError: string | RegExp): void {
  assertError(response);
  
  if (typeof expectedError === 'string') {
    expect(response.error).toContain(expectedError);
  } else {
    expect(response.error).toMatch(expectedError);
  }
}

/**
 * 断言分页响应
 */
export function assertPaginatedResponse<T>(
  response: any,
  expectedLength: number,
  expectedTotal?: number
): void {
  assertSuccess(response);
  expect(response.pagination).toBeDefined();
  expect(response.data).toHaveLength(expectedLength);
  
  if (expectedTotal !== undefined) {
    expect(response.pagination.total).toBe(expectedTotal);
  }
}

/**
 * 断言学员数据结构
 */
export function assertStudentStructure(student: any): void {
  expect(student).toHaveProperty('uid');
  expect(student).toHaveProperty('name');
  expect(student).toHaveProperty('phone');
  expect(student).toHaveProperty('class');
  expect(student).toHaveProperty('subject');
  expect(student).toHaveProperty('rings');
  expect(student.rings).toBeInstanceOf(Array);
}

/**
 * 断言交易数据结构
 */
export function assertTransactionStructure(transaction: any): void {
  expect(transaction).toHaveProperty('uid');
  expect(transaction).toHaveProperty('amount');
  expect(transaction.amount).toBeTypeOf('number');
  expect(transaction).toHaveProperty('student_id');
  expect(transaction).toHaveProperty('note');
}

/**
 * 断言分期数据结构
 */
export function assertInstallmentStructure(installment: any): void {
  expect(installment).toHaveProperty('uid');
  expect(installment).toHaveProperty('plan_id');
  expect(installment).toHaveProperty('installment_amount');
  expect(installment).toHaveProperty('current_installment');
  expect(installment).toHaveProperty('total_installments');
  expect(installment).toHaveProperty('due_date');
  expect(installment).toHaveProperty('status');
}

/**
 * 断言日期格式 (YYYY-MM-DD)
 */
export function assertDateFormat(date: string | null): void {
  if (date === null) return;
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
}

/**
 * 断言ISO日期格式
 */
export function assertISODateFormat(date: string | null): void {
  if (date === null) return;
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
}

/**
 * 断言金额格式（正数或负数，最多两位小数）
 */
export function assertAmountFormat(amount: number): void {
  expect(amount).toBeTypeOf('number');
  expect(Number.isFinite(amount)).toBe(true);
  
  const decimalPart = amount.toString().split('.')[1];
  if (decimalPart) {
    expect(decimalPart.length).toBeLessThanOrEqual(2);
  }
}

/**
 * 断言手机号格式
 */
export function assertPhoneFormat(phone: string): void {
  expect(phone).toMatch(/^1[3-9]\d{9}$/);
}

/**
 * 断言数组非空
 */
export function assertNonEmptyArray<T>(array: T[]): void {
  expect(array).toBeInstanceOf(Array);
  expect(array.length).toBeGreaterThan(0);
}

/**
 * 断言数组为空
 */
export function assertEmptyArray<T>(array: T[]): void {
  expect(array).toBeInstanceOf(Array);
  expect(array.length).toBe(0);
}

/**
 * 断言对象包含指定键
 */
export function assertHasKeys(obj: any, keys: string[]): void {
  keys.forEach(key => {
    expect(obj).toHaveProperty(key);
  });
}

/**
 * 断言数值在范围内
 */
export function assertInRange(value: number, min: number, max: number): void {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/**
 * 断言时间戳合理性（不是未来时间，不是太久以前）
 */
export function assertReasonableTimestamp(timestamp: string | Date): void {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  expect(date.getTime()).toBeLessThanOrEqual(now.getTime());
  expect(date.getTime()).toBeGreaterThanOrEqual(oneYearAgo.getTime());
}

/**
 * 断言会员状态有效
 */
export function assertValidMembershipStatus(status: string): void {
  expect(['None', 'Active', 'Expired', 'Upcoming']).toContain(status);
}

/**
 * 断言分期状态有效
 */
export function assertValidInstallmentStatus(status: string): void {
  expect(['Pending', 'Paid', 'Overdue', 'Cancelled']).toContain(status);
}
