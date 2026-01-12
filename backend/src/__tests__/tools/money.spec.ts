/**
 * 金额工具函数测试
 *
 * 测试后端 money.ts 中的所有工具函数
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
  CENTS_TO_YUAN_RATIO,
  MAX_SAFE_AMOUNT_YUAN,
  MIN_SAFE_AMOUNT_YUAN,
} from '@/utils/money';

describe('金额工具函数', () => {
  describe('yuanToCents - 元转分', () => {
    it('正确转换整数元', () => {
      expect(yuanToCents(100)).toBe(10000);
      expect(yuanToCents(50)).toBe(5000);
    });

    it('正确转换小数元', () => {
      expect(yuanToCents(99.99)).toBe(9999);
      expect(yuanToCents(0.01)).toBe(1);
      expect(yuanToCents(0.1)).toBe(10);
      expect(yuanToCents(12.34)).toBe(1234);
    });

    it('正确处理字符串输入', () => {
      expect(yuanToCents('100')).toBe(10000);
      expect(yuanToCents('99.99')).toBe(9999);
    });

    it('正确处理负数', () => {
      expect(yuanToCents(-100)).toBe(-10000);
      expect(yuanToCents(-0.01)).toBe(-1);
    });

    it('四舍五入处理', () => {
      expect(yuanToCents(0.005)).toBe(1); // 四舍五入
      expect(yuanToCents(0.004)).toBe(0); // 四舍五入
    });

    it('抛出无效金额错误', () => {
      expect(() => yuanToCents(NaN)).toThrow('Invalid amount');
      expect(() => yuanToCents(Infinity)).toThrow('Invalid amount');
      expect(() => yuanToCents(-Infinity)).toThrow('Invalid amount');
    });

    it('检查安全范围', () => {
      expect(() => yuanToCents(MAX_SAFE_AMOUNT_YUAN + 1)).toThrow('out of safe range');
      expect(() => yuanToCents(MIN_SAFE_AMOUNT_YUAN - 1)).toThrow('out of safe range');
    });
  });

  describe('centsToYuan - 分转元', () => {
    it('正确转换整数分', () => {
      expect(centsToYuan(10000)).toBe(100);
      expect(centsToYuan(5000)).toBe(50);
    });

    it('正确处理小数', () => {
      expect(centsToYuan(9999)).toBe(99.99);
      expect(centsToYuan(1)).toBe(0.01);
    });

    it('正确处理负数', () => {
      expect(centsToYuan(-10000)).toBe(-100);
      expect(centsToYuan(-1)).toBe(-0.01);
    });

    it('抛出无效分错误', () => {
      expect(() => centsToYuan(NaN as any)).toThrow('Invalid cents');
      expect(() => centsToYuan(Infinity as any)).toThrow('Invalid cents');
    });
  });

  describe('formatMoney - 格式化金额', () => {
    it('格式化正数', () => {
      expect(formatMoney(10000)).toBe('100.00');
      expect(formatMoney(9999)).toBe('99.99');
      expect(formatMoney(1)).toBe('0.01');
    });

    it('格式化负数', () => {
      expect(formatMoney(-10000)).toBe('-100.00');
      expect(formatMoney(-9999)).toBe('-99.99');
    });

    it('格式化零', () => {
      expect(formatMoney(0)).toBe('0.00');
    });
  });

  describe('isValidAmount - 验证金额', () => {
    it('接受有效数字', () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
      expect(isValidAmount(-100)).toBe(true);
      expect(isValidAmount(MAX_SAFE_AMOUNT_YUAN)).toBe(true);
      expect(isValidAmount(MIN_SAFE_AMOUNT_YUAN)).toBe(true);
    });

    it('拒绝无效数字', () => {
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
      expect(isValidAmount(-Infinity)).toBe(false);
    });

    it('接受有效字符串', () => {
      expect(isValidAmount('100')).toBe(true);
      expect(isValidAmount('99.99')).toBe(true);
      expect(isValidAmount('-100')).toBe(true);
    });

    it('拒绝无效字符串', () => {
      expect(isValidAmount('abc')).toBe(false);
      expect(isValidAmount('')).toBe(false);
    });

    it('拒绝范围外金额', () => {
      expect(isValidAmount(MAX_SAFE_AMOUNT_YUAN + 1)).toBe(false);
      expect(isValidAmount(MIN_SAFE_AMOUNT_YUAN - 1)).toBe(false);
    });

    it('拒绝非数字类型', () => {
      expect(isValidAmount(null)).toBe(false);
      expect(isValidAmount(undefined)).toBe(false);
      expect(isValidAmount({})).toBe(false);
    });
  });

  describe('addMoney - 金额加法', () => {
    it('正确相加', () => {
      expect(addMoney(10000, 5000)).toBe(15000);
      expect(addMoney(0, 1000)).toBe(1000);
    });

    it('处理负数相加', () => {
      expect(addMoney(10000, -5000)).toBe(5000);
      expect(addMoney(-10000, -5000)).toBe(-15000);
    });

    it('抛出无效参数错误', () => {
      expect(() => addMoney(NaN as any, 1000)).toThrow('Invalid amounts');
      expect(() => addMoney(1000, Infinity as any)).toThrow('Invalid amounts');
    });
  });

  describe('subtractMoney - 金额减法', () => {
    it('正确相减', () => {
      expect(subtractMoney(10000, 5000)).toBe(5000);
      expect(subtractMoney(0, 1000)).toBe(-1000);
    });

    it('处理负数', () => {
      expect(subtractMoney(5000, 10000)).toBe(-5000);
      expect(subtractMoney(-5000, -1000)).toBe(-4000);
    });

    it('抛出无效参数错误', () => {
      expect(() => subtractMoney(NaN as any, 1000)).toThrow('Invalid amounts');
    });
  });

  describe('multiplyMoney - 金额乘法', () => {
    it('正确相乘', () => {
      expect(multiplyMoney(10000, 2)).toBe(20000);
      expect(multiplyMoney(10000, 0.5)).toBe(5000);
    });

    it('处理小数乘数', () => {
      expect(multiplyMoney(10000, 1.5)).toBe(15000);
    });

    it('抛出无效参数错误', () => {
      expect(() => multiplyMoney(NaN as any, 2)).toThrow('Invalid values');
      expect(() => multiplyMoney(10000, Infinity as any)).toThrow('Invalid values');
    });
  });

  describe('divideMoney - 金额除法', () => {
    it('正确相除', () => {
      expect(divideMoney(10000, 2)).toBe(5000);
      expect(divideMoney(10000, 4)).toBe(2500);
    });

    it('四舍五入结果', () => {
      expect(divideMoney(10000, 3)).toBe(3333); // 3333.33... 四舍五入
    });

    it('抛出除以零错误', () => {
      expect(() => divideMoney(10000, 0)).toThrow('Cannot divide by zero');
    });

    it('抛出无效参数错误', () => {
      expect(() => divideMoney(NaN as any, 2)).toThrow('Invalid values');
    });
  });

  describe('compareMoney - 金额比较', () => {
    it('正确比较相等', () => {
      expect(compareMoney(10000, 10000)).toBe(0);
    });

    it('正确比较大小', () => {
      expect(compareMoney(10000, 5000)).toBe(1);
      expect(compareMoney(5000, 10000)).toBe(-1);
    });

    it('处理负数比较', () => {
      expect(compareMoney(-10000, -5000)).toBe(-1);
      expect(compareMoney(-5000, -10000)).toBe(1);
    });

    it('抛出无效参数错误', () => {
      expect(() => compareMoney(NaN as any, 1000)).toThrow('Invalid amounts');
    });
  });

  describe('常量验证', () => {
    it('CENTS_TO_YUAN_RATIO 应该是 100', () => {
      expect(CENTS_TO_YUAN_RATIO).toBe(100);
      expect(yuanToCents(1)).toBe(CENTS_TO_YUAN_RATIO);
      expect(centsToYuan(CENTS_TO_YUAN_RATIO)).toBe(1);
    });
  });

  describe('精度一致性测试', () => {
    it('元 -> 分 -> 元 转换保持精度', () => {
      const original = 99.99;
      const cents = yuanToCents(original);
      const backToYuan = centsToYuan(cents);
      expect(backToYuan).toBeCloseTo(original, 10);
    });

    it('分 -> 元 -> 分 转换保持精度', () => {
      const original = 9999;
      const yuan = centsToYuan(original);
      const backToCents = yuanToCents(yuan);
      expect(backToCents).toBe(original);
    });

    it('批量转换一致性', () => {
      const amounts = [0.01, 0.1, 1, 10, 100, 999.99, 1000];
      amounts.forEach((amount) => {
        const cents = yuanToCents(amount);
        const yuanBack = centsToYuan(cents);
        expect(yuanBack).toBeCloseTo(amount, 10);
      });
    });
  });

  describe('边界条件测试', () => {
    it('处理最小安全金额', () => {
      expect(yuanToCents(MIN_SAFE_AMOUNT_YUAN)).toBe(MIN_SAFE_AMOUNT_YUAN * 100);
    });

    it('处理最大安全金额', () => {
      expect(yuanToCents(MAX_SAFE_AMOUNT_YUAN)).toBe(MAX_SAFE_AMOUNT_YUAN * 100);
    });

    it('处理零', () => {
      expect(yuanToCents(0)).toBe(0);
      expect(centsToYuan(0)).toBe(0);
    });

    it('处理极端小数', () => {
      expect(yuanToCents(0.001)).toBe(0); // 四舍五入后为0
      expect(yuanToCents(0.009)).toBe(1); // 四舍五入后为1
    });
  });
});
