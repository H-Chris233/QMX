/**
 * 后端日期工具模块
 * 
 * 规范：
 * - 数据库存储使用 ISO 8601 字符串格式（UTC）
 * - 内部处理统一使用 UTC 时间
 * - API 输出使用 ISO 字符串或 YYYY-MM-DD 格式
 */

/**
 * 固定测试日期（仅测试环境使用）
 */
export const FIXED_TEST_DATE = new Date('2024-01-01T00:00:00.000Z');

/**
 * 将任意日期输入转换为 UTC Date 对象
 * @param input - 日期字符串、Date对象或undefined
 * @returns UTC Date对象
 */
export function toUTCDate(input?: string | Date | null): Date {
  if (!input) {
    return new Date();
  }
  
  if (input instanceof Date) {
    return input;
  }
  
  // 如果是 YYYY-MM-DD 格式，添加 UTC 时间部分
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(input + 'T00:00:00.000Z');
  }
  
  // ISO 字符串直接解析
  return new Date(input);
}

/**
 * 格式化日期为 ISO 8601 字符串
 * @param date - 日期对象
 * @returns ISO 8601格式字符串
 */
export function toISOString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  
  return d.toISOString();
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param date - 日期对象或ISO字符串
 * @returns YYYY-MM-DD格式字符串
 */
export function formatDateYYYYMMDD(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  
  return d.toISOString().split('T')[0];
}

/**
 * 增加天数
 * @param date - 基准日期
 * @param days - 天数（可以为负数）
 * @returns 新的Date对象
 */
export function addDays(date: Date | string, days: number): Date {
  const d = toUTCDate(date);
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * 增加月数
 * @param date - 基准日期
 * @param months - 月数（可以为负数）
 * @returns 新的Date对象
 */
export function addMonths(date: Date | string, months: number): Date {
  const d = toUTCDate(date);
  const result = new Date(d);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/**
 * 增加年数
 * @param date - 基准日期
 * @param years - 年数（可以为负数）
 * @returns 新的Date对象
 */
export function addYears(date: Date | string, years: number): Date {
  const d = toUTCDate(date);
  const result = new Date(d);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

/**
 * 判断日期是否在指定区间内
 * @param date - 待检查的日期
 * @param start - 区间开始日期
 * @param end - 区间结束日期
 * @returns 是否在区间内
 */
export function isDateInRange(
  date: Date | string,
  start: Date | string,
  end: Date | string
): boolean {
  const d = toUTCDate(date);
  const s = toUTCDate(start);
  const e = toUTCDate(end);
  
  return d >= s && d <= e;
}

/**
 * 判断日期是否过期
 * @param date - 待检查的日期
 * @param referenceDate - 参考日期，默认为当前时间
 * @returns 是否过期
 */
export function isExpired(date: Date | string, referenceDate?: Date | string): boolean {
  const d = toUTCDate(date);
  const ref = referenceDate ? toUTCDate(referenceDate) : new Date();
  
  return d < ref;
}

/**
 * 计算两个日期之间的天数差
 * @param date1 - 日期1
 * @param date2 - 日期2
 * @returns 天数差（date1 - date2）
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = toUTCDate(date1);
  const d2 = toUTCDate(date2);
  
  const diffMs = d1.getTime() - d2.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 解析 YYYY-MM-DD 格式字符串为 Date 对象
 * @param dateStr - YYYY-MM-DD格式字符串
 * @returns Date对象
 */
export function parseYYYYMMDD(dateStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Invalid date format: expected YYYY-MM-DD');
  }
  
  return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * 验证日期格式是否为 YYYY-MM-DD
 * @param dateStr - 日期字符串
 * @returns 是否符合格式
 */
export function isValidYYYYMMDD(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  
  const date = new Date(dateStr + 'T00:00:00.000Z');
  return !Number.isNaN(date.getTime());
}

/**
 * 获取月初日期
 * @param date - 基准日期
 * @returns 月初的Date对象
 */
export function getMonthStart(date: Date | string): Date {
  const d = toUTCDate(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * 获取月末日期
 * @param date - 基准日期
 * @returns 月末的Date对象
 */
export function getMonthEnd(date: Date | string): Date {
  const d = toUTCDate(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

/**
 * 获取今天的开始时间（UTC 00:00:00）
 * @returns Date对象
 */
export function getTodayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * 获取今天的结束时间（UTC 23:59:59.999）
 * @returns Date对象
 */
export function getTodayEnd(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
}
