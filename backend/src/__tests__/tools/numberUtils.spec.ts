/**
 * 数值工具函数测试
 *
 * 测试后端 numberUtils.ts 中的所有工具函数
 */

import {
  normalizePositiveInteger,
  isPositiveInteger,
  isNonNegativeInteger,
} from '@/utils/numberUtils';

describe('数值工具函数', () => {
  describe('normalizePositiveInteger - 规范化正整数', () => {
    it('处理有效正整数', () => {
      expect(normalizePositiveInteger(10)).toBe(10);
      expect(normalizePositiveInteger(100)).toBe(100);
    });

    it('处理字符串数字', () => {
      expect(normalizePositiveInteger('10')).toBe(10);
      expect(normalizePositiveInteger('100')).toBe(100);
    });

    it('处理浮点数', () => {
      expect(normalizePositiveInteger(10.7)).toBe(10);
      expect(normalizePositiveInteger(10.3)).toBe(10);
    });

    it('处理超出范围的值', () => {
      expect(normalizePositiveInteger(1000, 1, 100)).toBe(100);
      expect(normalizePositiveInteger(0, 1, 100)).toBe(1);
    });

    it('处理无效值返回最小值', () => {
      expect(normalizePositiveInteger(NaN)).toBe(1);
      expect(normalizePositiveInteger(Infinity)).toBe(1);
      expect(normalizePositiveInteger('abc' as any)).toBe(1);
      expect(normalizePositiveInteger(null as any)).toBe(1);
      expect(normalizePositiveInteger(undefined as any)).toBe(1);
    });

    it('使用自定义最小值', () => {
      expect(normalizePositiveInteger(5, 10, 100)).toBe(10);
      expect(normalizePositiveInteger(-5, 10, 100)).toBe(10);
    });

    it('使用自定义最大值', () => {
      expect(normalizePositiveInteger(200, 1, 100)).toBe(100);
    });

    it('处理边界值', () => {
      expect(normalizePositiveInteger(1, 1, 100)).toBe(1);
      expect(normalizePositiveInteger(100, 1, 100)).toBe(100);
    });
  });

  describe('isPositiveInteger - 检查正整数', () => {
    it('接受有效正整数', () => {
      expect(isPositiveInteger(1)).toBe(true);
      expect(isPositiveInteger(10)).toBe(true);
      expect(isPositiveInteger(100)).toBe(true);
    });

    it('接受字符串数字', () => {
      expect(isPositiveInteger('10')).toBe(true);
    });

    it('拒绝零', () => {
      expect(isPositiveInteger(0)).toBe(false);
    });

    it('拒绝负数', () => {
      expect(isPositiveInteger(-1)).toBe(false);
      expect(isPositiveInteger(-10)).toBe(false);
    });

    it('拒绝浮点数', () => {
      expect(isPositiveInteger(1.5)).toBe(false);
      // 注意：10.0 在 JavaScript 中就是整数 10，所以返回 true
      // 如果需要区分，需要用字符串形式 '10.0' 检查
      expect(isPositiveInteger(10.0)).toBe(true);
    });

    it('拒绝无效类型', () => {
      expect(isPositiveInteger(NaN)).toBe(false);
      expect(isPositiveInteger(Infinity)).toBe(false);
      expect(isPositiveInteger('abc')).toBe(false);
      expect(isPositiveInteger(null)).toBe(false);
      expect(isPositiveInteger(undefined)).toBe(false);
      expect(isPositiveInteger({})).toBe(false);
      expect(isPositiveInteger([])).toBe(false);
    });

    it('类型守卫功能', () => {
      const values: unknown[] = [1, 2, 3];
      const positiveIntegers = values.filter(isPositiveInteger);
      expect(positiveIntegers).toEqual([1, 2, 3]);
    });
  });

  describe('isNonNegativeInteger - 检查非负整数', () => {
    it('接受零和正整数', () => {
      expect(isNonNegativeInteger(0)).toBe(true);
      expect(isNonNegativeInteger(1)).toBe(true);
      expect(isNonNegativeInteger(100)).toBe(true);
    });

    it('接受字符串数字', () => {
      expect(isNonNegativeInteger('0')).toBe(true);
      expect(isNonNegativeInteger('10')).toBe(true);
    });

    it('拒绝负数', () => {
      expect(isNonNegativeInteger(-1)).toBe(false);
      expect(isNonNegativeInteger(-10)).toBe(false);
    });

    it('拒绝浮点数', () => {
      expect(isNonNegativeInteger(1.5)).toBe(false);
      // 注意：0.0 在 JavaScript 中就是整数 0，所以返回 true
      expect(isNonNegativeInteger(0.0)).toBe(true);
    });

    it('拒绝无效类型', () => {
      expect(isNonNegativeInteger(NaN)).toBe(false);
      expect(isNonNegativeInteger(Infinity)).toBe(false);
      expect(isNonNegativeInteger('abc')).toBe(false);
      expect(isNonNegativeInteger(null)).toBe(false);
    });

    it('类型守卫功能', () => {
      const values: unknown[] = [0, 1, 2, -1, 3];
      const nonNegativeIntegers = values.filter(isNonNegativeInteger);
      expect(nonNegativeIntegers).toEqual([0, 1, 2, 3]);
    });
  });

  describe('工具函数组合使用', () => {
    it('先规范化后验证', () => {
      const rawValue = '15.7';
      const normalized = normalizePositiveInteger(rawValue, 1, 100);
      expect(isPositiveInteger(normalized)).toBe(true);
      expect(normalized).toBe(15);
    });

    it('过滤并规范化数组', () => {
      // 注意：normalizePositiveInteger 对无效值返回 min=1，所以
      // 无效值('abc', '-5', null, undefined)规范化后会变成1，也会被 isPositiveInteger 接受
      const values = ['10.5', 'abc', '20', '-5', '30.3', null, undefined];
      const normalized = values
        .map((v) => normalizePositiveInteger(v, 1, 100))
        .filter((v) => isPositiveInteger(v));
      // 实际结果：10.5->10, abc->1, 20->20, -5->1, 30.3->30, null->1, undefined->1
      expect(normalized).toEqual([10, 1, 20, 1, 30, 1, 1]);
    });

    it('仅保留有效整数输入', () => {
      // 先过滤无效输入，再规范化
      const values = ['10.5', 'abc', '20', '-5', '30.3', null, undefined];
      const validOnly = values.filter(isPositiveInteger);
      expect(validOnly).toEqual(['20']); // 只有 '20' 是有效的正整数字符串
    });

    it('区分正整数和非负整数', () => {
      const positiveOnly = [1, 2, 3].filter(isPositiveInteger);
      const nonNegative = [0, 1, 2, 3].filter(isNonNegativeInteger);
      expect(positiveOnly).toEqual([1, 2, 3]);
      expect(nonNegative).toEqual([0, 1, 2, 3]);
    });
  });

  describe('边界条件测试', () => {
    it('处理极大数值', () => {
      const maxSafe = Number.MAX_SAFE_INTEGER;
      expect(normalizePositiveInteger(maxSafe, 1, 100)).toBe(100);
    });

    it('处理极小数值', () => {
      expect(normalizePositiveInteger(-Number.MAX_VALUE, 1, 100)).toBe(1);
    });

    it('处理科学计数法字符串', () => {
      expect(normalizePositiveInteger('1e2')).toBe(100);
      expect(isPositiveInteger('1e2')).toBe(true);
    });

    it('处理十六进制字符串', () => {
      expect(normalizePositiveInteger('0x10')).toBe(16);
      expect(isPositiveInteger('0x10')).toBe(true);
    });

    it('处理八进制字符串', () => {
      expect(normalizePositiveInteger('0o10')).toBe(8);
      expect(isPositiveInteger('0o10')).toBe(true);
    });

    it('处理二进制字符串', () => {
      expect(normalizePositiveInteger('0b1010')).toBe(10);
      expect(isPositiveInteger('0b1010')).toBe(true);
    });
  });

  describe('与金额工具整合测试', () => {
    it('验证页码参数', () => {
      expect(isPositiveInteger(1)).toBe(true);
      expect(normalizePositiveInteger('5', 1, 100)).toBe(5);
    });

    it('验证限制参数', () => {
      expect(normalizePositiveInteger('50', 1, 100)).toBe(50);
      expect(normalizePositiveInteger('200', 1, 100)).toBe(100);
    });

    it('验证学生ID', () => {
      const uid = 12345;
      expect(isPositiveInteger(uid)).toBe(true);
      expect(isPositiveInteger(-1)).toBe(false);
    });
  });
});
