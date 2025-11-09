import { describe, it, expect } from 'vitest';
import {
  yuanToCents,
  centsToYuan,
  formatMoney,
  formatMoneyWithSymbol,
  parseMoney,
  isValidAmount,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  compareMoney,
  formatMoneyWithThousands,
  CENTS_TO_YUAN_RATIO,
  AMOUNT_DECIMALS,
  MAX_SAFE_AMOUNT_YUAN,
  MIN_SAFE_AMOUNT_YUAN,
} from '../money';

describe('money utilities', () => {
  describe('yuanToCents', () => {
    it('应该将元转换为分', () => {
      expect(yuanToCents(100)).toBe(10000);
      expect(yuanToCents(100.5)).toBe(10050);
      expect(yuanToCents(100.55)).toBe(10055);
    });

    it('应该处理字符串输入', () => {
      expect(yuanToCents('100')).toBe(10000);
      expect(yuanToCents('100.50')).toBe(10050);
    });

    it('应该四舍五入到分', () => {
      expect(yuanToCents(100.505)).toBe(10051);
      expect(yuanToCents(100.504)).toBe(10050);
      expect(yuanToCents(100.995)).toBe(10100);
    });

    it('应该处理负数', () => {
      expect(yuanToCents(-100.50)).toBe(-10050);
    });

    it('应该处理零', () => {
      expect(yuanToCents(0)).toBe(0);
    });

    it('应该在无效输入时抛出错误', () => {
      expect(() => yuanToCents(NaN)).toThrow('Invalid amount');
      expect(() => yuanToCents(Infinity)).toThrow('Invalid amount');
      expect(() => yuanToCents('invalid')).toThrow('Invalid amount');
    });

    it('应该在超出安全范围时抛出错误', () => {
      expect(() => yuanToCents(MAX_SAFE_AMOUNT_YUAN + 1)).toThrow('Amount out of safe range');
      expect(() => yuanToCents(MIN_SAFE_AMOUNT_YUAN - 1)).toThrow('Amount out of safe range');
    });
  });

  describe('centsToYuan', () => {
    it('应该将分转换为元', () => {
      expect(centsToYuan(10000)).toBe(100);
      expect(centsToYuan(10050)).toBe(100.5);
      expect(centsToYuan(10055)).toBe(100.55);
    });

    it('应该处理负数', () => {
      expect(centsToYuan(-10050)).toBe(-100.5);
    });

    it('应该处理零', () => {
      expect(centsToYuan(0)).toBe(0);
    });

    it('应该在无效输入时抛出错误', () => {
      expect(() => centsToYuan(NaN)).toThrow('Invalid cents');
      expect(() => centsToYuan(Infinity)).toThrow('Invalid cents');
    });
  });

  describe('formatMoney', () => {
    it('应该格式化为两位小数', () => {
      expect(formatMoney(10000)).toBe('100.00');
      expect(formatMoney(10050)).toBe('100.50');
      expect(formatMoney(10055)).toBe('100.55');
    });

    it('应该处理整数金额', () => {
      expect(formatMoney(10000)).toBe('100.00');
    });

    it('应该处理零', () => {
      expect(formatMoney(0)).toBe('0.00');
    });

    it('应该处理负数', () => {
      expect(formatMoney(-10050)).toBe('-100.50');
    });
  });

  describe('formatMoneyWithSymbol', () => {
    it('应该添加默认货币符号', () => {
      expect(formatMoneyWithSymbol(10050)).toBe('¥100.50');
    });

    it('应该支持自定义货币符号', () => {
      expect(formatMoneyWithSymbol(10050, '$')).toBe('$100.50');
      expect(formatMoneyWithSymbol(10050, '€')).toBe('€100.50');
    });
  });

  describe('parseMoney', () => {
    it('应该解析纯数字字符串', () => {
      expect(parseMoney('100.50')).toBe(10050);
    });

    it('应该移除货币符号', () => {
      expect(parseMoney('¥100.50')).toBe(10050);
      expect(parseMoney('$100.50')).toBe(10050);
      expect(parseMoney('€100.50')).toBe(10050);
    });

    it('应该移除空格', () => {
      expect(parseMoney(' 100.50 ')).toBe(10050);
      expect(parseMoney('¥ 100.50')).toBe(10050);
    });
  });

  describe('isValidAmount', () => {
    it('应该验证有效的数字金额', () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(100.50)).toBe(true);
      expect(isValidAmount(0)).toBe(true);
      expect(isValidAmount(-100)).toBe(true);
    });

    it('应该验证有效的字符串金额', () => {
      expect(isValidAmount('100')).toBe(true);
      expect(isValidAmount('100.50')).toBe(true);
    });

    it('应该拒绝无效值', () => {
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
      expect(isValidAmount('invalid')).toBe(false);
      expect(isValidAmount(null)).toBe(false);
      expect(isValidAmount(undefined)).toBe(false);
    });

    it('应该拒绝超出范围的值', () => {
      expect(isValidAmount(MAX_SAFE_AMOUNT_YUAN + 1)).toBe(false);
      expect(isValidAmount(MIN_SAFE_AMOUNT_YUAN - 1)).toBe(false);
    });
  });

  describe('addMoney', () => {
    it('应该正确相加', () => {
      expect(addMoney(10000, 5000)).toBe(15000);
      expect(addMoney(10050, 5025)).toBe(15075);
    });

    it('应该处理负数', () => {
      expect(addMoney(10000, -5000)).toBe(5000);
      expect(addMoney(-10000, -5000)).toBe(-15000);
    });

    it('应该在无效输入时抛出错误', () => {
      expect(() => addMoney(NaN, 100)).toThrow('Invalid amounts');
      expect(() => addMoney(100, Infinity)).toThrow('Invalid amounts');
    });
  });

  describe('subtractMoney', () => {
    it('应该正确相减', () => {
      expect(subtractMoney(10000, 5000)).toBe(5000);
      expect(subtractMoney(10050, 5025)).toBe(5025);
    });

    it('应该处理负数', () => {
      expect(subtractMoney(10000, -5000)).toBe(15000);
      expect(subtractMoney(-10000, 5000)).toBe(-15000);
    });

    it('应该在无效输入时抛出错误', () => {
      expect(() => subtractMoney(NaN, 100)).toThrow('Invalid amounts');
    });
  });

  describe('multiplyMoney', () => {
    it('应该正确相乘', () => {
      expect(multiplyMoney(10000, 2)).toBe(20000);
      expect(multiplyMoney(10000, 1.5)).toBe(15000);
    });

    it('应该四舍五入结果', () => {
      expect(multiplyMoney(10001, 1.5)).toBe(15002); // 15001.5 -> 15002
      expect(multiplyMoney(10000, 1.504)).toBe(15040); // 15040
    });

    it('应该处理负数', () => {
      expect(multiplyMoney(10000, -2)).toBe(-20000);
      expect(multiplyMoney(-10000, 2)).toBe(-20000);
    });

    it('应该在无效输入时抛出错误', () => {
      expect(() => multiplyMoney(NaN, 2)).toThrow('Invalid values');
    });
  });

  describe('divideMoney', () => {
    it('应该正确相除', () => {
      expect(divideMoney(10000, 2)).toBe(5000);
      expect(divideMoney(10000, 3)).toBe(3333); // 10000/3 = 3333.33... -> 3333
    });

    it('应该四舍五入结果', () => {
      expect(divideMoney(10001, 2)).toBe(5001); // 5000.5 -> 5001
      expect(divideMoney(10000, 3)).toBe(3333); // 3333.33... -> 3333
    });

    it('应该处理负数', () => {
      expect(divideMoney(10000, -2)).toBe(-5000);
      expect(divideMoney(-10000, 2)).toBe(-5000);
    });

    it('应该在除以零时抛出错误', () => {
      expect(() => divideMoney(10000, 0)).toThrow('Cannot divide by zero');
    });

    it('应该在无效输入时抛出错误', () => {
      expect(() => divideMoney(NaN, 2)).toThrow('Invalid values');
    });
  });

  describe('compareMoney', () => {
    it('应该比较相等的金额', () => {
      expect(compareMoney(10000, 10000)).toBe(0);
    });

    it('应该比较较小的金额', () => {
      expect(compareMoney(5000, 10000)).toBe(-1);
    });

    it('应该比较较大的金额', () => {
      expect(compareMoney(10000, 5000)).toBe(1);
    });

    it('应该处理负数', () => {
      expect(compareMoney(-5000, -10000)).toBe(1);
      expect(compareMoney(-10000, -5000)).toBe(-1);
    });

    it('应该在无效输入时抛出错误', () => {
      expect(() => compareMoney(NaN, 100)).toThrow('Invalid amounts');
    });
  });

  describe('formatMoneyWithThousands', () => {
    it('应该添加千分位分隔符', () => {
      expect(formatMoneyWithThousands(123456789)).toBe('1,234,567.89');
      expect(formatMoneyWithThousands(1234567)).toBe('12,345.67');
      expect(formatMoneyWithThousands(123456)).toBe('1,234.56');
    });

    it('应该处理小额金额', () => {
      expect(formatMoneyWithThousands(10050)).toBe('100.50');
      expect(formatMoneyWithThousands(100)).toBe('1.00');
    });

    it('应该处理零', () => {
      expect(formatMoneyWithThousands(0)).toBe('0.00');
    });

    it('应该处理负数', () => {
      expect(formatMoneyWithThousands(-123456789)).toBe('-1,234,567.89');
    });
  });

  describe('精度测试', () => {
    it('应该避免浮点数精度问题', () => {
      // 0.1 + 0.2 在JavaScript中不等于0.3
      const result = addMoney(yuanToCents(0.1), yuanToCents(0.2));
      expect(formatMoney(result)).toBe('0.30');
    });

    it('应该正确处理多次计算', () => {
      let amount = yuanToCents(100);
      amount = multiplyMoney(amount, 1.1); // 110元
      amount = divideMoney(amount, 3); // 36.67元
      expect(formatMoney(amount)).toBe('36.67');
    });
  });

  describe('边界值测试', () => {
    it('应该处理最大安全金额', () => {
      const cents = yuanToCents(MAX_SAFE_AMOUNT_YUAN);
      expect(centsToYuan(cents)).toBe(MAX_SAFE_AMOUNT_YUAN);
    });

    it('应该处理最小安全金额', () => {
      const cents = yuanToCents(MIN_SAFE_AMOUNT_YUAN);
      expect(centsToYuan(cents)).toBe(MIN_SAFE_AMOUNT_YUAN);
    });

    it('应该处理极小金额', () => {
      expect(yuanToCents(0.01)).toBe(1);
      expect(formatMoney(1)).toBe('0.01');
    });
  });
});
