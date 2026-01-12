/**
 * Boundary Conditions Tests
 *
 * 边界条件测试 - 覆盖极端情况和边界值
 */

import {
  yuanToCents,
  centsToYuan,
  formatMoney,
  isValidAmount,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  compareMoney,
  MAX_SAFE_AMOUNT_YUAN,
  MIN_SAFE_AMOUNT_YUAN,
  CENTS_TO_YUAN_RATIO,
} from '@/utils/money';
import { AppError, ErrorType, toAppError, serializeError } from '@/utils/errors';
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

describe('Money Utilities - Boundary Conditions', () => {
  describe('yuanToCents - 元转分', () => {
    it('handles positive integers', () => {
      expect(yuanToCents(100)).toBe(10000);
      expect(yuanToCents(1)).toBe(100);
      expect(yuanToCents(0.01)).toBe(1);
    });

    it('handles negative amounts', () => {
      expect(yuanToCents(-100)).toBe(-10000);
      expect(yuanToCents(-0.01)).toBe(-1);
    });

    it('handles string input', () => {
      expect(yuanToCents('100')).toBe(10000);
      expect(yuanToCents('99.99')).toBe(9999);
    });

    it('handles decimal precision correctly', () => {
      // 0.005 应该四舍五入到 1
      expect(yuanToCents(0.005)).toBe(1);
      // 0.004 应该四舍五入到 0
      expect(yuanToCents(0.004)).toBe(0);
      // 0.015 应该四舍五入到 2
      expect(yuanToCents(0.015)).toBe(2);
    });

    it('throws on non-finite values', () => {
      expect(() => yuanToCents(Infinity)).toThrow('must be a finite number');
      expect(() => yuanToCents(-Infinity)).toThrow('must be a finite number');
      expect(() => yuanToCents(NaN)).toThrow('must be a finite number');
    });

    it('throws on out of range values', () => {
      expect(() => yuanToCents(MAX_SAFE_AMOUNT_YUAN + 1)).toThrow('out of safe range');
      expect(() => yuanToCents(MIN_SAFE_AMOUNT_YUAN - 1)).toThrow('out of safe range');
    });

    it('handles maximum safe amount', () => {
      expect(yuanToCents(MAX_SAFE_AMOUNT_YUAN)).toBe(MAX_SAFE_AMOUNT_YUAN * CENTS_TO_YUAN_RATIO);
    });
  });

  describe('centsToYuan - 分转元', () => {
    it('handles positive integers', () => {
      expect(centsToYuan(10000)).toBe(100);
      expect(centsToYuan(100)).toBe(1);
      expect(centsToYuan(1)).toBe(0.01);
    });

    it('handles negative amounts', () => {
      expect(centsToYuan(-10000)).toBe(-100);
      expect(centsToYuan(-1)).toBe(-0.01);
    });

    it('handles zero', () => {
      expect(centsToYuan(0)).toBe(0);
    });

    it('throws on non-finite values', () => {
      expect(() => centsToYuan(Infinity as any)).toThrow('must be a finite number');
      expect(() => centsToYuan(NaN as any)).toThrow('must be a finite number');
    });

    it('produces correct precision', () => {
      expect(centsToYuan(9999)).toBe(99.99);
      expect(centsToYuan(10001)).toBe(100.01);
    });
  });

  describe('formatMoney - 格式化金额', () => {
    it('formats positive amounts', () => {
      expect(formatMoney(10000)).toBe('100.00');
      expect(formatMoney(9999)).toBe('99.99');
      expect(formatMoney(1)).toBe('0.01');
    });

    it('formats negative amounts', () => {
      expect(formatMoney(-10000)).toBe('-100.00');
      expect(formatMoney(-9999)).toBe('-99.99');
    });

    it('formats zero', () => {
      expect(formatMoney(0)).toBe('0.00');
    });

    it('handles large amounts', () => {
      expect(formatMoney(99999999999)).toBe('999999999.99');
    });
  });

  describe('isValidAmount - 金额验证', () => {
    it('accepts valid numbers', () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
      expect(isValidAmount(-100)).toBe(true);
      expect(isValidAmount(0)).toBe(true);
    });

    it('rejects invalid numbers', () => {
      expect(isValidAmount(Infinity)).toBe(false);
      expect(isValidAmount(-Infinity)).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
    });

    it('accepts valid strings', () => {
      expect(isValidAmount('100')).toBe(true);
      expect(isValidAmount('99.99')).toBe(true);
      expect(isValidAmount('-50')).toBe(true);
    });

    it('rejects invalid strings', () => {
      expect(isValidAmount('abc')).toBe(false);
      expect(isValidAmount('')).toBe(false);
    });

    it('rejects out of range values', () => {
      expect(isValidAmount(MAX_SAFE_AMOUNT_YUAN + 1)).toBe(false);
      expect(isValidAmount(MIN_SAFE_AMOUNT_YUAN - 1)).toBe(false);
    });

    it('rejects non-numeric types', () => {
      expect(isValidAmount(null)).toBe(false);
      expect(isValidAmount(undefined)).toBe(false);
      expect(isValidAmount({})).toBe(false);
      expect(isValidAmount([])).toBe(false);
    });
  });

  describe('Money Operations - 金额运算', () => {
    describe('addMoney', () => {
      it('adds positive amounts', () => {
        expect(addMoney(10000, 5000)).toBe(15000);
      });

      it('handles negative amounts', () => {
        expect(addMoney(10000, -5000)).toBe(5000);
        expect(addMoney(-10000, 5000)).toBe(-5000);
        expect(addMoney(-10000, -5000)).toBe(-15000);
      });

      it('throws on non-finite values', () => {
        expect(() => addMoney(Infinity, 1000)).toThrow();
        expect(() => addMoney(1000, NaN)).toThrow();
      });
    });

    describe('subtractMoney', () => {
      it('subtracts positive amounts', () => {
        expect(subtractMoney(10000, 5000)).toBe(5000);
      });

      it('handles negative results', () => {
        expect(subtractMoney(5000, 10000)).toBe(-5000);
      });

      it('throws on non-finite values', () => {
        expect(() => subtractMoney(Infinity, 1000)).toThrow();
      });
    });

    describe('multiplyMoney', () => {
      it('multiplies correctly', () => {
        expect(multiplyMoney(10000, 2)).toBe(20000);
        expect(multiplyMoney(10000, 0.5)).toBe(5000);
        expect(multiplyMoney(10000, 1.5)).toBe(15000); // 四舍五入
      });

      it('handles negative multiplier', () => {
        expect(multiplyMoney(10000, -1)).toBe(-10000);
      });

      it('rounds to nearest integer', () => {
        expect(multiplyMoney(10000, 0.333)).toBe(3330);
      });
    });

    describe('divideMoney', () => {
      it('divides correctly', () => {
        expect(divideMoney(10000, 2)).toBe(5000);
        expect(divideMoney(10000, 3)).toBe(3333); // 四舍五入
      });

      it('throws on zero division', () => {
        expect(() => divideMoney(10000, 0)).toThrow('Cannot divide by zero');
      });

      it('throws on non-finite divisor', () => {
        expect(() => divideMoney(10000, Infinity)).toThrow();
      });
    });

    describe('compareMoney', () => {
      it('returns -1 for less than', () => {
        expect(compareMoney(5000, 10000)).toBe(-1);
      });

      it('returns 1 for greater than', () => {
        expect(compareMoney(10000, 5000)).toBe(1);
      });

      it('returns 0 for equal', () => {
        expect(compareMoney(10000, 10000)).toBe(0);
      });

      it('throws on non-finite values', () => {
        expect(() => compareMoney(Infinity, 1000)).toThrow();
      });
    });
  });

  describe('Money Consistency - 金额转换一致性', () => {
    it('yuanToCents and centsToYuan are inverses', () => {
      const testAmounts = [0, 0.01, 0.1, 1, 10, 99.99, 100, 1000, 9999.99];
      testAmounts.forEach((yuan) => {
        const cents = yuanToCents(yuan);
        const backToYuan = centsToYuan(cents);
        expect(backToYuan).toBeCloseTo(yuan, 10);
      });
    });

    it('handles round-trip for negative amounts', () => {
      const testAmounts = [-100, -99.99, -1, -0.01];
      testAmounts.forEach((yuan) => {
        const cents = yuanToCents(yuan);
        const backToYuan = centsToYuan(cents);
        expect(backToYuan).toBeCloseTo(yuan, 10);
      });
    });

    it('preserves integer values', () => {
      // 整元应该精确转换
      for (let i = 0; i <= 1000; i += 100) {
        const cents = yuanToCents(i);
        expect(cents % 100).toBe(0);
        expect(centsToYuan(cents)).toBe(i);
      }
    });
  });
});

describe('Error Utilities - Boundary Conditions', () => {
  describe('AppError Factory Methods', () => {
    it('creates InvalidInput error', () => {
      const error = AppError.invalidInput('Invalid input');
      expect(error.type).toBe(ErrorType.InvalidInput);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('creates NotFound error', () => {
      const error = AppError.notFound('Resource not found');
      expect(error.type).toBe(ErrorType.NotFound);
      expect(error.statusCode).toBe(404);
    });

    it('creates State error', () => {
      const error = AppError.state('State conflict');
      expect(error.type).toBe(ErrorType.State);
      expect(error.statusCode).toBe(409);
    });

    it('creates Unauthorized error', () => {
      const error = AppError.unauthorized('Not authenticated');
      expect(error.type).toBe(ErrorType.Unauthorized);
      expect(error.statusCode).toBe(401);
    });

    it('creates Forbidden error', () => {
      const error = AppError.forbidden('Access denied');
      expect(error.type).toBe(ErrorType.Forbidden);
      expect(error.statusCode).toBe(403);
    });

    it('creates RateLimit error', () => {
      const error = AppError.rateLimited('Too many requests');
      expect(error.type).toBe(ErrorType.RateLimit);
      expect(error.statusCode).toBe(429);
    });

    it('creates Other error', () => {
      const error = AppError.other('Internal error');
      expect(error.type).toBe(ErrorType.Other);
      expect(error.statusCode).toBe(500);
    });
  });

  describe('AppError Options', () => {
    it('accepts custom statusCode', () => {
      const error = AppError.notFound('Not found', { statusCode: 418 });
      expect(error.statusCode).toBe(418);
    });

    it('accepts custom code', () => {
      const error = AppError.invalidInput('Error', { code: 'CUSTOM_CODE' });
      expect(error.code).toBe('CUSTOM_CODE');
    });

    it('accepts details', () => {
      const error = AppError.state('Error', { details: { extra: 'data' } });
      expect(error.details).toEqual({ extra: 'data' });
    });

    it('accepts cause', () => {
      const cause = new Error('Original error');
      const error = AppError.other('Error', { cause });
      expect((error as any).cause).toBe(cause);
    });

    it('calculates expose default correctly', () => {
      const clientError = AppError.invalidInput('Client error');
      const serverError = AppError.other('Server error');
      expect(clientError.expose).toBe(true);
      expect(serverError.expose).toBe(false);
    });
  });

  describe('toAppError - Error Conversion', () => {
    it('passes through AppError', () => {
      const original = AppError.notFound('Original');
      const result = toAppError(original);
      expect(result).toBe(original);
    });

    it('converts Error to AppError', () => {
      const error = new Error('Something went wrong');
      const result = toAppError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Something went wrong');
    });

    it('converts plain object to AppError', () => {
      const obj = { message: 'Object error', type: ErrorType.NotFound };
      const result = toAppError(obj);
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Object error');
      expect(result.type).toBe(ErrorType.NotFound);
    });

    it('uses fallback for null/undefined', () => {
      const fallback = { message: 'Fallback message', type: ErrorType.Other };
      const result = toAppError(null, fallback);
      expect(result.message).toBe('Fallback message');
    });

    it('handles legacy prefix format', () => {
      const error = new Error('NotFound: Resource missing');
      const result = toAppError(error);
      expect(result.type).toBe(ErrorType.NotFound);
      expect(result.message).toBe('Resource missing');
    });

    it('falls back to Other for unrecognized type', () => {
      const obj = { message: 'Unknown error', type: 'UnknownType' as ErrorType };
      const result = toAppError(obj);
      expect(result.type).toBe(ErrorType.Other);
    });

    it('applies statusCode from fallback', () => {
      const obj = { message: 'Error' };
      const result = toAppError(obj, { statusCode: 418 });
      expect(result.statusCode).toBe(418);
    });
  });

  describe('serializeError', () => {
    it('serializes basic error', () => {
      const error = AppError.notFound('Not found');
      const serialized = serializeError(error);
      expect(serialized.type).toBe(ErrorType.NotFound);
      expect(serialized.message).toBe('Not found');
      expect(serialized.code).toBeUndefined();
      expect(serialized.details).toBeUndefined();
    });

    it('includes code when present', () => {
      const error = AppError.invalidInput('Error', { code: 'ERR_001' });
      const serialized = serializeError(error);
      expect(serialized.code).toBe('ERR_001');
    });

    it('includes details when present', () => {
      const error = AppError.state('Error', { details: { extra: 'data' } });
      const serialized = serializeError(error);
      expect(serialized.details).toEqual({ extra: 'data' });
    });

    it('excludes undefined details', () => {
      const error = AppError.notFound('Not found');
      const serialized = serializeError(error);
      // details should not be in the serialized object
      expect(serialized.details).toBeUndefined();
    });
  });
});

describe('Date Utilities - Boundary Conditions', () => {
  describe('toUTCDate - 日期转换', () => {
    it('handles null/undefined', () => {
      const result1 = toUTCDate(null);
      const result2 = toUTCDate(undefined);
      // 应该返回当前日期
      expect(result1 instanceof Date).toBe(true);
      expect(result2 instanceof Date).toBe(true);
    });

    it('handles Date objects', () => {
      const input = new Date('2024-06-15T12:00:00Z');
      const result = toUTCDate(input);
      expect(result).toBe(input);
    });

    it('handles YYYY-MM-DD format', () => {
      const result = toUTCDate('2024-06-15');
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(5); // June = 5
      expect(result.getUTCDate()).toBe(15);
    });

    it('handles ISO format', () => {
      const result = toUTCDate('2024-06-15T12:30:45.000Z');
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(5);
      expect(result.getUTCDate()).toBe(15);
    });
  });

  describe('toISOString - ISO格式化', () => {
    it('formats Date correctly', () => {
      const date = new Date('2024-06-15T12:30:45.000Z');
      expect(toISOString(date)).toBe('2024-06-15T12:30:45.000Z');
    });

    it('formats string input', () => {
      expect(toISOString('2024-06-15')).toMatch(/^2024-06-15T/);
    });

    it('throws on invalid date', () => {
      expect(() => toISOString('invalid')).toThrow('Invalid date');
      expect(() => toISOString(new Date('invalid'))).toThrow('Invalid date');
    });
  });

  describe('formatDateYYYYMMDD - YYYY-MM-DD格式化', () => {
    it('formats correctly', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      expect(formatDateYYYYMMDD(date)).toBe('2024-06-15');
    });

    it('handles string input', () => {
      expect(formatDateYYYYMMDD('2024-06-15T12:00:00Z')).toBe('2024-06-15');
    });

    it('throws on invalid date', () => {
      expect(() => formatDateYYYYMMDD('invalid')).toThrow('Invalid date');
    });
  });

  describe('addDays - 增加天数', () => {
    it('adds positive days', () => {
      const result = addDays(FIXED_TEST_DATE, 10);
      expect(result.getUTCDate()).toBe(11); // Jan 1 + 10 days = Jan 11
    });

    it('subtracts negative days', () => {
      const result = addDays(FIXED_TEST_DATE, -5);
      expect(result.getUTCDate()).toBe(27); // Jan 1 - 5 days = Dec 27 (previous year)
      expect(result.getUTCFullYear()).toBe(2023);
    });

    it('handles month boundary', () => {
      const jan31 = new Date('2024-01-31T00:00:00.000Z');
      const result = addDays(jan31, 1);
      expect(result.getUTCMonth()).toBe(1); // Feb
      expect(result.getUTCDate()).toBe(1);
    });

    it('handles year boundary', () => {
      const dec31 = new Date('2024-12-31T00:00:00.000Z');
      const result = addDays(dec31, 1);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCDate()).toBe(1);
    });
  });

  describe('addMonths - 增加月数', () => {
    it('adds positive months', () => {
      const result = addMonths(FIXED_TEST_DATE, 1);
      expect(result.getUTCMonth()).toBe(1); // Feb
      expect(result.getUTCDate()).toBe(1);
    });

    it('subtracts negative months', () => {
      const result = addMonths(FIXED_TEST_DATE, -1);
      expect(result.getUTCMonth()).toBe(11); // Dec
      expect(result.getUTCFullYear()).toBe(2023);
    });

    it('handles month overflow correctly', () => {
      // Jan 31 + 1 month should be Feb 28/29 (last day of Feb)
      const jan31 = new Date('2024-01-31T00:00:00.000Z');
      const result = addMonths(jan31, 1);
      expect(result.getUTCMonth()).toBe(1); // Feb
      expect(result.getUTCDate()).toBe(29); // 2024 is leap year
    });

    it('handles multiple months', () => {
      const result = addMonths(FIXED_TEST_DATE, 13);
      expect(result.getUTCMonth()).toBe(1); // Feb
      expect(result.getUTCFullYear()).toBe(2025);
    });
  });

  describe('addYears - 增加年数', () => {
    it('adds positive years', () => {
      const result = addYears(FIXED_TEST_DATE, 1);
      expect(result.getUTCFullYear()).toBe(2025);
    });

    it('subtracts negative years', () => {
      const result = addYears(FIXED_TEST_DATE, -1);
      expect(result.getUTCFullYear()).toBe(2023);
    });

    it('preserves month and day', () => {
      const result = addYears(FIXED_TEST_DATE, 4);
      expect(result.getUTCFullYear()).toBe(2028);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(1);
    });
  });

  describe('isDateInRange - 日期范围检查', () => {
    it('returns true for date in range', () => {
      expect(isDateInRange('2024-06-15', '2024-01-01', '2024-12-31')).toBe(true);
    });

    it('returns false for date before range', () => {
      expect(isDateInRange('2024-01-01', '2024-06-15', '2024-12-31')).toBe(false);
    });

    it('returns false for date after range', () => {
      expect(isDateInRange('2024-12-31', '2024-01-01', '2024-06-15')).toBe(false);
    });

    it('handles edge cases at boundaries', () => {
      expect(isDateInRange('2024-06-15', '2024-06-15', '2024-06-15')).toBe(true);
    });
  });

  describe('isExpired - 过期检查', () => {
    it('returns true for past dates', () => {
      expect(isExpired('2020-01-01')).toBe(true);
    });

    it('returns false for future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(isExpired(futureDate.toISOString())).toBe(false);
    });

    it('uses reference date', () => {
      const testDate = new Date('2024-06-15T00:00:00.000Z');
      const refDate = new Date('2024-06-01T00:00:00.000Z');
      expect(isExpired(testDate, refDate)).toBe(false);

      const refDateAfter = new Date('2024-06-30T00:00:00.000Z');
      expect(isExpired(testDate, refDateAfter)).toBe(true);
    });
  });

  describe('daysBetween - 日期差计算', () => {
    it('calculates positive difference', () => {
      const diff = daysBetween('2024-06-15', '2024-06-01');
      expect(diff).toBe(14);
    });

    it('calculates negative difference', () => {
      const diff = daysBetween('2024-06-01', '2024-06-15');
      expect(diff).toBe(-14);
    });

    it('handles same day', () => {
      const diff = daysBetween('2024-06-15', '2024-06-15');
      expect(diff).toBe(0);
    });

    it('handles leap year', () => {
      // Feb 29, 2024 to Mar 1, 2024 should be 1 day
      const diff = daysBetween('2024-03-01', '2024-02-29');
      expect(diff).toBe(1);
    });
  });

  describe('parseYYYYMMDD - YYYY-MM-DD解析', () => {
    it('parses valid format', () => {
      const result = parseYYYYMMDD('2024-06-15');
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(5);
      expect(result.getUTCDate()).toBe(15);
    });

    it('throws on invalid format', () => {
      expect(() => parseYYYYMMDD('2024-6-15')).toThrow();
      expect(() => parseYYYYMMDD('24-06-15')).toThrow();
      expect(() => parseYYYYMMDD('2024/06/15')).toThrow();
      expect(() => parseYYYYMMDD('not a date')).toThrow();
    });
  });

  describe('isValidYYYYMMDD - YYYY-MM-DD验证', () => {
    it('returns true for valid format', () => {
      expect(isValidYYYYMMDD('2024-06-15')).toBe(true);
      expect(isValidYYYYMMDD('2024-12-31')).toBe(true);
    });

    it('returns false for invalid format', () => {
      expect(isValidYYYYMMDD('2024-6-15')).toBe(false);
      expect(isValidYYYYMMDD('24-06-15')).toBe(false);
      expect(isValidYYYYMMDD('2024/06/15')).toBe(false);
    });

    it('rejects invalid dates', () => {
      expect(isValidYYYYMMDD('2024-02-30')).toBe(false); // Feb 30 doesn't exist
      expect(isValidYYYYMMDD('2024-13-01')).toBe(false); // Month 13
      expect(isValidYYYYMMDD('2024-00-01')).toBe(false); // Month 0
    });
  });

  describe('getMonthStart/End - 月初月末', () => {
    it('gets month start', () => {
      const result = getMonthStart('2024-06-15');
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(5);
      expect(result.getUTCDate()).toBe(1);
    });

    it('gets month end', () => {
      const result = getMonthEnd('2024-06-15');
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(5);
      expect(result.getUTCDate()).toBe(30);
    });

    it('handles February in leap year', () => {
      const result = getMonthEnd('2024-02-15');
      expect(result.getUTCDate()).toBe(29);
    });

    it('handles February in non-leap year', () => {
      const result = getMonthEnd('2023-02-15');
      expect(result.getUTCDate()).toBe(28);
    });
  });

  describe('getTodayStart/End - 今天开始结束', () => {
    it('returns Date objects', () => {
      const start = getTodayStart();
      const end = getTodayEnd();
      expect(start instanceof Date).toBe(true);
      expect(end instanceof Date).toBe(true);
    });

    it('start is before end', () => {
      const start = getTodayStart();
      const end = getTodayEnd();
      expect(start.getTime()).toBeLessThan(end.getTime());
    });

    it('start is at UTC midnight', () => {
      const start = getTodayStart();
      expect(start.getUTCHours()).toBe(0);
      expect(start.getUTCMinutes()).toBe(0);
      expect(start.getUTCSeconds()).toBe(0);
    });

    it('end is at UTC 23:59:59.999', () => {
      const end = getTodayEnd();
      expect(end.getUTCHours()).toBe(23);
      expect(end.getUTCMinutes()).toBe(59);
      expect(end.getUTCSeconds()).toBe(59);
      expect(end.getUTCMilliseconds()).toBe(999);
    });
  });
});

describe('Date-Money Consistency - 日期金额一致性', () => {
  describe('Financial date handling', () => {
    it('formats money for display with date', () => {
      const amount = 10000; // 100.00 元
      const date = '2024-06-15';
      const formattedAmount = formatMoney(amount);
      const formattedDate = formatDateYYYYMMDD(date);

      expect(formattedAmount).toBe('100.00');
      expect(formattedDate).toBe('2024-06-15');
    });

    it('handles date calculations with money values', () => {
      // 模拟会员到期计算
      const startDate = new Date('2024-01-01');
      const durationMonths = 3;
      const endDate = addMonths(startDate, durationMonths);

      // 验证日期计算正确
      expect(endDate.getUTCMonth()).toBe(3); // April (0-indexed: 0=Jan, 3=April)
      expect(endDate.getUTCDate()).toBe(1);
    });

    it('validates date and amount together', () => {
      const validateTransaction = (date: string, amount: number) => {
        const isValidDate = isValidYYYYMMDD(date);
        const isValidAmountNum = isValidAmount(amount);
        return isValidDate && isValidAmountNum;
      };

      expect(validateTransaction('2024-06-15', 100)).toBe(true);
      expect(validateTransaction('invalid', 100)).toBe(false);
      expect(validateTransaction('2024-06-15', Infinity)).toBe(false);
    });
  });
});
