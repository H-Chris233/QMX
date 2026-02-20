/**
 * 数据转换器单元测试
 * 演示各函数的使用方法和预期行为
 */

import { describe, it, expect } from 'vitest';
import {
  safeParseNumber,
  transformDashboardData,
  validateTransactionData,
  validateTransactionInput,
  validateScoreInput,
  formatScore,
  normalizeMembershipRecord,
  formatDateRange,
  formatCurrency,
  calculateScoreStats,
  MAX_SAFE_AMOUNT,
  MIN_AMOUNT,
  AMOUNT_DECIMALS,
} from '../dataTransformers';

describe('safeParseNumber', () => {
  it('应该正确解析数字', () => {
    expect(safeParseNumber(123.45, 0)).toBe(123.45);
    expect(safeParseNumber('123.45', 0)).toBe(123.45);
    expect(safeParseNumber('invalid', 0)).toBe(0);
  });

  it('应该支持范围限制', () => {
    expect(safeParseNumber(150, 0, { min: 0, max: 100 })).toBe(100);
    expect(safeParseNumber(-50, 0, { min: 0, max: 100 })).toBe(0);
    expect(safeParseNumber(50, 0, { min: 0, max: 100 })).toBe(50);
  });

  it('应该支持小数位控制', () => {
    expect(safeParseNumber(123.456, 0, { decimals: 2 })).toBe(123.46);
    expect(safeParseNumber(123.454, 0, { decimals: 2 })).toBe(123.45);
  });

  it('应该支持负数控制', () => {
    expect(safeParseNumber(-50, 0, { allowNegative: false })).toBe(0);
    expect(safeParseNumber(-50, 0, { allowNegative: true })).toBe(-50);
  });
});

describe('transformDashboardData', () => {
  it('应该正确转换仪表板数据', () => {
    const raw = {
      total_revenue: 12345.67,
      total_students: 150,
      average_score: 8.5,
      total_expense: 5000,
      net_income: 7345.67,
      max_score: 10,
      active_courses: 5,
    };

    const result = transformDashboardData(raw);

    expect(result).toEqual({
      totalRevenue: 12345.67,
      activeStudents: 150,
      averageGrade: 8.5,
    });
  });

  it('应该处理无效数据', () => {
    const raw = {
      total_revenue: 'invalid' as any,
      total_students: -10,
      average_score: 1500,
      total_expense: 0,
      net_income: 0,
      max_score: 0,
      active_courses: 0,
    };

    const result = transformDashboardData(raw);

    expect(result.totalRevenue).toBe(0);
    expect(result.activeStudents).toBe(0); // 负数被限制为0
    expect(result.averageGrade).toBe(1000); // 超出范围被限制为最大值
  });

  it('应该优先使用当月收入字段', () => {
    const raw = {
      monthly_revenue: 8888.88,
      total_revenue: 99999.99,
      total_students: 10,
      average_score: 8,
      total_expense: 0,
      net_income: 0,
      max_score: 0,
      active_courses: 0,
    };

    const result = transformDashboardData(raw as any);
    expect(result.totalRevenue).toBe(8888.88);
  });
});

describe('validateTransactionData', () => {
  it('应该验证有效交易', () => {
    const validTransaction = {
      uid: 1,
      amount: 100.50,
      student_id: 1,
      note: 'Test transaction',
    };

    expect(validateTransactionData(validTransaction)).toBe(true);
  });

  it('应该拒绝无效交易', () => {
    expect(validateTransactionData(null)).toBe(false);
    expect(validateTransactionData({ amount: 'invalid' })).toBe(false);
    expect(validateTransactionData({ amount: NaN })).toBe(false);
    expect(validateTransactionData({ amount: MAX_SAFE_AMOUNT + 1 })).toBe(false);
  });
});

describe('validateTransactionInput', () => {
  it('应该验证有效输入', () => {
    const result = validateTransactionInput({
      amount: 100.50,
      student_id: 1,
      note: 'Test',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该返回错误信息', () => {
    const result = validateTransactionInput({
      amount: 'invalid' as any,
      student_id: -1,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('应该验证分期信息', () => {
    const result = validateTransactionInput({
      amount: 100,
      is_installment: true,
      installment_current: 2,
      installment_total: 1, // 错误：当前期数大于总期数
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('当前期数不能大于总期数');
  });
});

describe('validateScoreInput', () => {
  it('应该验证有效成绩', () => {
    const result = validateScoreInput(85.5);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该拒绝无效成绩', () => {
    const invalidScore = validateScoreInput('abc' as any);
    expect(invalidScore.valid).toBe(false);

    const outOfRange = validateScoreInput(1500);
    expect(outOfRange.valid).toBe(false);
  });
});

describe('formatScore', () => {
  it('应该格式化成绩', () => {
    expect(formatScore(85.567)).toBe('85.6');
    expect(formatScore('90')).toBe('90.0');
    expect(formatScore(null, 'N/A')).toBe('N/A');
  });
});

describe('calculateScoreStats', () => {
  it('应该计算成绩统计', () => {
    const scores = [85, 90, 75, 95, 80];
    const stats = calculateScoreStats(scores);

    expect(stats.count).toBe(5);
    expect(stats.average).toBe(85.0);
    expect(stats.max).toBe(95.0);
    expect(stats.min).toBe(75.0);
  });

  it('应该处理空数组', () => {
    const stats = calculateScoreStats([]);
    expect(stats.count).toBe(0);
    expect(stats.average).toBe(0);
  });
});

describe('normalizeMembershipRecord', () => {
  it('应该标准化会员记录', () => {
    const record = {
      uid: 1,
      name: '张三',
      phone: '13800138000',
      membership_start_date: '2024-01-01',
      membership_end_date: '2024-12-31',
      is_membership_active: true,
      membership_days_remaining: 30,
    };

    const result = normalizeMembershipRecord(record);

    expect(result).not.toBeNull();
    expect(result?.uid).toBe(1);
    expect(result?.name).toBe('张三');
    expect(result?.membership_status).toBe('Active');
  });

  it('应该拒绝无效记录', () => {
    expect(normalizeMembershipRecord(null as any)).toBeNull();
    expect(normalizeMembershipRecord({ uid: 1 } as any)).toBeNull(); // 缺少 name
  });
});

describe('formatDateRange', () => {
  it('应该格式化日期范围', () => {
    expect(formatDateRange('2024-01-01', '2024-12-31'))
      .toBe('2024-01-01 至 2024-12-31');
    
    expect(formatDateRange('2024-01-01', null))
      .toBe('2024-01-01 起');
    
    expect(formatDateRange(null, '2024-12-31'))
      .toBe('至 2024-12-31');
    
    expect(formatDateRange(null, null))
      .toBe('--');
  });
});

describe('formatCurrency', () => {
  it('应该格式化货币', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1,234.56');
    expect(result).toContain('¥');
  });

  it('应该处理负数', () => {
    const result = formatCurrency(-100);
    expect(result).toContain('-');
    expect(result).toContain('100.00');
  });
});

describe('常量定义', () => {
  it('应该导出所有必需的常量', () => {
    expect(MAX_SAFE_AMOUNT).toBe(999999999999);
    expect(MIN_AMOUNT).toBe(-999999999999);
    expect(AMOUNT_DECIMALS).toBe(2);
  });
});
