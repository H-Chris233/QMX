/**
 * 日期工具函数测试
 *
 * 测试后端 date.ts 中的所有工具函数
 */

import {
  toUTCDate,
  toISOString,
  formatDateYYYYMMDD,
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
  getTodayStart,
  getTodayEnd,
  FIXED_TEST_DATE,
} from '@/utils/date';

describe('日期工具函数', () => {
  describe('toUTCDate - 转换为UTC日期', () => {
    it('处理 Date 对象', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const result = toUTCDate(date);
      expect(result).toEqual(date);
    });

    it('处理 ISO 字符串', () => {
      const result = toUTCDate('2024-06-15T12:00:00Z');
      expect(result.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('处理 YYYY-MM-DD 格式', () => {
      const result = toUTCDate('2024-06-15');
      expect(result.toISOString().startsWith('2024-06-15T00:00:00')).toBe(true);
    });

    it('处理 undefined 返回当前时间', () => {
      const before = new Date();
      const result = toUTCDate(undefined);
      const after = new Date();
      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('处理 null 返回当前时间', () => {
      const result = toUTCDate(null);
      expect(result).toBeInstanceOf(Date);
    });

    it('处理空字符串返回当前时间', () => {
      const result = toUTCDate('');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('toISOString - 格式化ISO字符串', () => {
    it('格式化 Date 对象', () => {
      const date = new Date('2024-06-15T12:30:00Z');
      const result = toISOString(date);
      expect(result).toBe('2024-06-15T12:30:00.000Z');
    });

    it('格式化 ISO 字符串', () => {
      const result = toISOString('2024-06-15T12:30:00Z');
      expect(result).toBe('2024-06-15T12:30:00.000Z');
    });

    it('抛出无效日期错误', () => {
      expect(() => toISOString(new Date('invalid'))).toThrow('Invalid date');
    });
  });

  describe('formatDateYYYYMMDD - 格式化YYYY-MM-DD', () => {
    it('格式化 Date 对象', () => {
      const result = formatDateYYYYMMDD(new Date('2024-06-15T12:00:00Z'));
      expect(result).toBe('2024-06-15');
    });

    it('格式化 ISO 字符串', () => {
      const result = formatDateYYYYMMDD('2024-06-15T12:00:00Z');
      expect(result).toBe('2024-06-15');
    });

    it('抛出无效日期错误', () => {
      expect(() => formatDateYYYYMMDD(new Date('invalid'))).toThrow('Invalid date');
    });
  });

  describe('addDays - 增加天数', () => {
    it('增加正数天数', () => {
      const result = addDays('2024-06-15', 5);
      expect(formatDateYYYYMMDD(result)).toBe('2024-06-20');
    });

    it('减少负数天数', () => {
      const result = addDays('2024-06-15', -5);
      expect(formatDateYYYYMMDD(result)).toBe('2024-06-10');
    });

    it('处理跨月', () => {
      const result = addDays('2024-06-28', 5);
      expect(formatDateYYYYMMDD(result)).toBe('2024-07-03');
    });

    it('处理跨年', () => {
      const result = addDays('2024-12-30', 5);
      expect(formatDateYYYYMMDD(result)).toBe('2025-01-04');
    });

    it('处理闰年', () => {
      const result = addDays('2024-02-28', 2);
      expect(formatDateYYYYMMDD(result)).toBe('2024-03-01');
    });
  });

  describe('addMonths - 增加月数', () => {
    it('增加正数月数', () => {
      const result = addMonths('2024-06-15', 1);
      expect(formatDateYYYYMMDD(result)).toBe('2024-07-15');
    });

    it('减少负数月数', () => {
      const result = addMonths('2024-06-15', -1);
      expect(formatDateYYYYMMDD(result)).toBe('2024-05-15');
    });

    it('处理月末日期溢出', () => {
      const result = addMonths('2024-01-31', 1);
      expect(formatDateYYYYMMDD(result)).toBe('2024-02-29'); // 2024是闰年
    });

    it('处理跨年', () => {
      const result = addMonths('2024-12-15', 2);
      expect(formatDateYYYYMMDD(result)).toBe('2025-02-15');
    });

    it('处理多个月', () => {
      const result = addMonths('2024-06-15', 6);
      expect(formatDateYYYYMMDD(result)).toBe('2024-12-15');
    });
  });

  describe('addYears - 增加年数', () => {
    it('增加正数年数', () => {
      const result = addYears('2024-06-15', 1);
      expect(formatDateYYYYMMDD(result)).toBe('2025-06-15');
    });

    it('减少负数年数', () => {
      const result = addYears('2024-06-15', -1);
      expect(formatDateYYYYMMDD(result)).toBe('2023-06-15');
    });

    it('处理闰年日期', () => {
      const result = addYears('2024-02-29', 1);
      expect(formatDateYYYYMMDD(result)).toBe('2025-02-28'); // 2025不是闰年
    });
  });

  describe('isDateInRange - 判断日期是否在区间内', () => {
    it('日期在区间内', () => {
      expect(isDateInRange('2024-06-15', '2024-06-01', '2024-06-30')).toBe(true);
    });

    it('日期在区间边界', () => {
      expect(isDateInRange('2024-06-01', '2024-06-01', '2024-06-30')).toBe(true);
      expect(isDateInRange('2024-06-30', '2024-06-01', '2024-06-30')).toBe(true);
    });

    it('日期在区间外', () => {
      expect(isDateInRange('2024-06-01', '2024-06-15', '2024-06-30')).toBe(false);
      expect(isDateInRange('2024-07-01', '2024-06-15', '2024-06-30')).toBe(false);
    });
  });

  describe('isExpired - 判断日期是否过期', () => {
    it('过去日期已过期', () => {
      expect(isExpired('2024-01-01', '2024-06-01')).toBe(true);
    });

    it('future日期未过期', () => {
      expect(isExpired('2024-06-01', '2024-01-01')).toBe(false);
    });

    it('使用当前时间作为参考', () => {
      const pastDate = addDays(new Date(), -1);
      const futureDate = addDays(new Date(), 1);
      expect(isExpired(pastDate)).toBe(true);
      expect(isExpired(futureDate)).toBe(false);
    });

    it('今天不算过期', () => {
      const today = formatDateYYYYMMDD(new Date());
      expect(isExpired(today)).toBe(false);
    });
  });

  describe('daysBetween - 计算天数差', () => {
    it('计算正确天数差', () => {
      expect(daysBetween('2024-06-15', '2024-06-10')).toBe(5);
      expect(daysBetween('2024-06-10', '2024-06-15')).toBe(-5);
    });

    it('计算同一天差', () => {
      expect(daysBetween('2024-06-15', '2024-06-15')).toBe(0);
    });

    it('处理跨月', () => {
      expect(daysBetween('2024-06-15', '2024-07-15')).toBe(-30);
    });

    it('处理跨年', () => {
      expect(daysBetween('2024-12-31', '2025-01-01')).toBe(-1);
    });
  });

  describe('parseYYYYMMDD - 解析日期字符串', () => {
    it('正确解析有效日期', () => {
      const result = parseYYYYMMDD('2024-06-15');
      expect(formatDateYYYYMMDD(result)).toBe('2024-06-15');
    });

    it('抛出无效格式错误', () => {
      expect(() => parseYYYYMMDD('2024/06/15')).toThrow('Invalid date format');
      expect(() => parseYYYYMMDD('06-15-2024')).toThrow('Invalid date format');
      expect(() => parseYYYYMMDD('20240615')).toThrow('Invalid date format');
    });

    it('处理无效日期', () => {
      expect(() => parseYYYYMMDD('2024-13-45')).toThrow('Invalid date format');
    });
  });

  describe('isValidYYYYMMDD - 验证日期格式', () => {
    it('接受有效格式', () => {
      expect(isValidYYYYMMDD('2024-06-15')).toBe(true);
      expect(isValidYYYYMMDD('2024-01-01')).toBe(true);
      expect(isValidYYYYMMDD('2024-12-31')).toBe(true);
    });

    it('拒绝无效格式', () => {
      expect(isValidYYYYMMDD('2024/06/15')).toBe(false);
      expect(isValidYYYYMMDD('06-15-2024')).toBe(false);
      expect(isValidYYYYMMDD('20240615')).toBe(false);
    });

    it('拒绝无效日期', () => {
      expect(isValidYYYYMMDD('2024-13-45')).toBe(false);
      expect(isValidYYYYMMDD('2024-00-01')).toBe(false);
    });
  });

  describe('getMonthStart - 获取月初', () => {
    it('获取月初日期', () => {
      const result = getMonthStart('2024-06-15');
      expect(formatDateYYYYMMDD(result)).toBe('2024-06-01');
    });

    it('处理跨年', () => {
      const result = getMonthStart('2024-12-31');
      expect(formatDateYYYYMMDD(result)).toBe('2024-12-01');
    });
  });

  describe('getMonthEnd - 获取月末', () => {
    it('获取月末日期', () => {
      const result = getMonthEnd('2024-06-15');
      expect(formatDateYYYYMMDD(result)).toBe('2024-06-30');
    });

    it('处理2月', () => {
      const resultFeb = getMonthEnd('2024-02-15');
      expect(formatDateYYYYMMDD(resultFeb)).toBe('2024-02-29'); // 闰年
    });

    it('处理非闰年2月', () => {
      const result = getMonthEnd('2023-02-15');
      expect(formatDateYYYYMMDD(result)).toBe('2023-02-28');
    });

    it('处理跨年', () => {
      const result = getMonthEnd('2024-12-15');
      expect(formatDateYYYYMMDD(result)).toBe('2024-12-31');
    });
  });

  describe('getTodayStart - 获取今天开始', () => {
    it('返回今天 UTC 00:00:00', () => {
      const result = getTodayStart();
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });
  });

  describe('getTodayEnd - 获取今天结束', () => {
    it('返回今天 UTC 23:59:59.999', () => {
      const result = getTodayEnd();
      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
      expect(result.getUTCMilliseconds()).toBe(999);
    });
  });

  describe('FIXED_TEST_DATE - 常量', () => {
    it('固定测试日期应该是 2024-01-01', () => {
      expect(formatDateYYYYMMDD(FIXED_TEST_DATE)).toBe('2024-01-01');
    });
  });

  describe('日期链式操作测试', () => {
    it('日期操作链', () => {
      const start = '2024-01-01';
      const afterAdd = addMonths(addDays(start, 5), 2);
      expect(isDateInRange(afterAdd, start, '2024-06-30')).toBe(true);
    });

    it('计算操作后天数', () => {
      const date1 = '2024-06-01';
      const date2 = addDays(addMonths(date1, 1), 10);
      expect(daysBetween(date2, date1)).toBeGreaterThan(30);
    });
  });
});
