/**
 * 日期测试辅助函数
 */

/**
 * 增加天数
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 增加月数
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * 创建相对日期
 */
export function daysAgo(days: number): Date {
  return addDays(new Date(), -days);
}

/**
 * 创建未来日期
 */
export function daysFromNow(days: number): Date {
  return addDays(new Date(), days);
}

/**
 * 创建会员期间的日期对象
 */
export function createMembershipPeriod(
  daysBeforeStart: number = 5,
  daysUntilEnd: number = 25
): { startDate: Date; endDate: Date } {
  const now = new Date();
  const startDate = addDays(now, -daysBeforeStart);
  const endDate = addDays(now, daysUntilEnd);
  return { startDate, endDate };
}

/**
 * 创建已过期的会员期间
 */
export function createExpiredMembership(daysSinceExpired: number = 10): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const endDate = addDays(now, -daysSinceExpired);
  const startDate = addDays(endDate, -30);
  return { startDate, endDate };
}

/**
 * 创建即将开始的会员期间
 */
export function createUpcomingMembership(daysUntilStart: number = 10): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const startDate = addDays(now, daysUntilStart);
  const endDate = addDays(startDate, 30);
  return { startDate, endDate };
}
