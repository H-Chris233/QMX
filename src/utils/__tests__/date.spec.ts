import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  toUTCDate,
  formatDateYYYYMMDD,
  formatDateLocale,
  getTodayYYYYMMDD,
  addDays,
  addMonths,
  addYears,
  isDateInRange,
  isExpired,
  daysBetween,
  parseYYYYMMDD,
  isValidYYYYMMDD,
  getMonthStart,
  getMonthEnd,
  FIXED_TEST_DATE,
} from '../date';

describe('date utilities', () => {
  beforeEach(() => {
    // 固定测试时间
    vi.setSystemTime(FIXED_TEST_DATE);
  });

  describe('toUTCDate', () => {
    it('应该转换 YYYY-MM-DD 字符串为 UTC Date', () => {
      const result = toUTCDate('2024-01-15');
      expect(result.toISOString()).toBe('2024-01-15T00:00:00.000Z');
    });

    it('应该接受 Date 对象', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = toUTCDate(date);
      expect(result.toISOString()).toBe(date.toISOString());
    });

    it('应该接受 ISO 字符串', () => {
      const result = toUTCDate('2024-01-15T12:00:00Z');
      expect(result.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    it('应该在无输入时返回当前时间', () => {
      const result = toUTCDate();
      // 验证返回的是日期对象
      expect(result.getTime).toBeDefined();
      expect(result.toISOString).toBeDefined();
      // 在测试环境中，系统时间被固定，所以应该返回固定的测试时间
      expect(result.toISOString()).toBe(FIXED_TEST_DATE.toISOString());
    });

    it('应该处理 null 输入', () => {
      const result = toUTCDate(null);
      // 验证返回的是日期对象
      expect(result.getTime).toBeDefined();
      expect(result.toISOString).toBeDefined();
      expect(result.toISOString()).toBe(FIXED_TEST_DATE.toISOString());
    });
  });

  describe('formatDateYYYYMMDD', () => {
    it('应该格式化 Date 对象为 YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDateYYYYMMDD(date)).toBe('2024-01-15');
    });

    it('应该格式化 ISO 字符串为 YYYY-MM-DD', () => {
      expect(formatDateYYYYMMDD('2024-01-15T12:00:00Z')).toBe('2024-01-15');
    });

    it('应该处理月份和日期的前导零', () => {
      const date = new Date('2024-03-05T00:00:00Z');
      expect(formatDateYYYYMMDD(date)).toBe('2024-03-05');
    });

    it('应该在无效日期时抛出错误', () => {
      expect(() => formatDateYYYYMMDD('invalid')).toThrow('Invalid date');
    });
  });

  describe('formatDateLocale', () => {
    it('应该格式化为本地化字符串', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = formatDateLocale(date, 'zh-CN');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('应该处理无效日期', () => {
      expect(formatDateLocale('invalid')).toBe('');
    });
  });

  describe('getTodayYYYYMMDD', () => {
    it('应该返回今天的日期（固定测试时间）', () => {
      expect(getTodayYYYYMMDD()).toBe('2024-01-01');
    });
  });

  describe('addDays', () => {
    it('应该增加天数', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = addDays(date, 7);
      expect(formatDateYYYYMMDD(result)).toBe('2024-01-22');
    });

    it('应该减少天数（负数）', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = addDays(date, -5);
      expect(formatDateYYYYMMDD(result)).toBe('2024-01-10');
    });

    it('应该接受字符串输入', () => {
      const result = addDays('2024-01-15', 10);
      expect(formatDateYYYYMMDD(result)).toBe('2024-01-25');
    });
  });

  describe('addMonths', () => {
    it('应该增加月数', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = addMonths(date, 3);
      expect(formatDateYYYYMMDD(result)).toBe('2024-04-15');
    });

    it('应该跨年增加月数', () => {
      const date = new Date('2024-11-15T00:00:00Z');
      const result = addMonths(date, 3);
      expect(formatDateYYYYMMDD(result)).toBe('2025-02-15');
    });

    it('应该减少月数', () => {
      const date = new Date('2024-03-15T00:00:00Z');
      const result = addMonths(date, -2);
      expect(formatDateYYYYMMDD(result)).toBe('2024-01-15');
    });
  });

  describe('addYears', () => {
    it('应该增加年数', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = addYears(date, 2);
      expect(formatDateYYYYMMDD(result)).toBe('2026-01-15');
    });

    it('应该减少年数', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = addYears(date, -1);
      expect(formatDateYYYYMMDD(result)).toBe('2023-01-15');
    });
  });

  describe('isDateInRange', () => {
    it('应该判断日期在区间内', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-31T00:00:00Z');
      expect(isDateInRange(date, start, end)).toBe(true);
    });

    it('应该判断日期不在区间内', () => {
      const date = new Date('2024-02-15T00:00:00Z');
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-31T00:00:00Z');
      expect(isDateInRange(date, start, end)).toBe(false);
    });

    it('应该包含边界日期', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-31T00:00:00Z');
      expect(isDateInRange(date, start, end)).toBe(true);
    });
  });

  describe('isExpired', () => {
    it('应该判断过期日期', () => {
      const date = new Date('2023-12-31T00:00:00Z');
      expect(isExpired(date, FIXED_TEST_DATE)).toBe(true);
    });

    it('应该判断未过期日期', () => {
      const date = new Date('2024-12-31T00:00:00Z');
      expect(isExpired(date, FIXED_TEST_DATE)).toBe(false);
    });

    it('应该使用当前时间作为默认参考日期', () => {
      const pastDate = new Date('2023-01-01T00:00:00Z');
      expect(isExpired(pastDate)).toBe(true);
    });
  });

  describe('daysBetween', () => {
    it('应该计算正确的天数差', () => {
      const date1 = new Date('2024-01-15T00:00:00Z');
      const date2 = new Date('2024-01-10T00:00:00Z');
      expect(daysBetween(date1, date2)).toBe(5);
    });

    it('应该处理负数天数差', () => {
      const date1 = new Date('2024-01-10T00:00:00Z');
      const date2 = new Date('2024-01-15T00:00:00Z');
      expect(daysBetween(date1, date2)).toBe(-5);
    });

    it('应该处理跨月的天数差', () => {
      const date1 = new Date('2024-02-05T00:00:00Z');
      const date2 = new Date('2024-01-25T00:00:00Z');
      expect(daysBetween(date1, date2)).toBe(11);
    });
  });

  describe('parseYYYYMMDD', () => {
    it('应该解析有效的 YYYY-MM-DD 字符串', () => {
      const result = parseYYYYMMDD('2024-01-15');
      expect(result.toISOString()).toBe('2024-01-15T00:00:00.000Z');
    });

    it('应该在无效格式时抛出错误', () => {
      expect(() => parseYYYYMMDD('2024/01/15')).toThrow('Invalid date format');
      expect(() => parseYYYYMMDD('15-01-2024')).toThrow('Invalid date format');
      expect(() => parseYYYYMMDD('invalid')).toThrow('Invalid date format');
    });
  });

  describe('isValidYYYYMMDD', () => {
    it('应该验证有效的 YYYY-MM-DD 字符串', () => {
      expect(isValidYYYYMMDD('2024-01-15')).toBe(true);
      expect(isValidYYYYMMDD('2024-12-31')).toBe(true);
    });

    it('应该拒绝无效的格式', () => {
      expect(isValidYYYYMMDD('2024/01/15')).toBe(false);
      expect(isValidYYYYMMDD('15-01-2024')).toBe(false);
      expect(isValidYYYYMMDD('invalid')).toBe(false);
      expect(isValidYYYYMMDD('2024-13-01')).toBe(false);
      expect(isValidYYYYMMDD('2024-01-32')).toBe(false);
    });
  });

  describe('getMonthStart', () => {
    it('应该获取月初日期', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = getMonthStart(date);
      expect(formatDateYYYYMMDD(result)).toBe('2024-01-01');
      expect(result.getUTCHours()).toBe(0);
    });

    it('应该处理字符串输入', () => {
      const result = getMonthStart('2024-01-15');
      expect(formatDateYYYYMMDD(result)).toBe('2024-01-01');
    });
  });

  describe('getMonthEnd', () => {
    it('应该获取月末日期', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = getMonthEnd(date);
      expect(formatDateYYYYMMDD(result)).toBe('2024-01-31');
    });

    it('应该处理二月（非闰年）', () => {
      const date = new Date('2023-02-15T00:00:00Z');
      const result = getMonthEnd(date);
      expect(formatDateYYYYMMDD(result)).toBe('2023-02-28');
    });

    it('应该处理二月（闰年）', () => {
      const date = new Date('2024-02-15T00:00:00Z');
      const result = getMonthEnd(date);
      expect(formatDateYYYYMMDD(result)).toBe('2024-02-29');
    });
  });

  describe('跨时区测试', () => {
    it('应该在不同时区保持一致性', () => {
      // 模拟不同时区的输入
      const date1 = new Date('2024-01-15T00:00:00.000Z');
      const date2 = new Date('2024-01-15T08:00:00.000+08:00'); // 北京时间
      
      expect(formatDateYYYYMMDD(date1)).toBe('2024-01-15');
      expect(formatDateYYYYMMDD(date2)).toBe('2024-01-15');
    });

    it('应该正确处理跨日期边界的时间', () => {
      const date = new Date('2024-01-15T23:59:59.999Z');
      expect(formatDateYYYYMMDD(date)).toBe('2024-01-15');
      
      const nextDay = addDays(date, 1);
      expect(formatDateYYYYMMDD(nextDay)).toBe('2024-01-16');
    });
  });
});
