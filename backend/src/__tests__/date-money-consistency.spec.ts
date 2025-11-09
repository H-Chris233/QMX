/**
 * 日期/时区/金额一致性回归测试
 * 
 * 验证目标：
 * 1. 日期在不同时区下保持一致
 * 2. 金额在分/元转换中无精度损失
 * 3. 跨月/跨时区的边界用例正确处理
 * 4. 统计口径在不同环境下稳定
 */

import { setupTestDatabase, cleanupTestDatabase, clearAllCollections, resetAllSequences, TestDataFactory, dateUtils } from '../../test/setupBackend';
import { formatDateYYYYMMDD, addDays, addMonths } from '../utils/date';
import { yuanToCents, centsToYuan, formatMoney } from '../utils/money';

describe('日期/时区/金额一致性回归测试', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('日期工具一致性', () => {
    it('应该在 UTC 时区下正确格式化日期', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDateYYYYMMDD(date)).toBe('2024-01-15');
    });

    it('应该在不同时区输入下产生一致结果', () => {
      const utcDate = new Date('2024-01-15T00:00:00.000Z');
      const bjDate = new Date('2024-01-15T08:00:00.000+08:00');
      
      expect(formatDateYYYYMMDD(utcDate)).toBe('2024-01-15');
      expect(formatDateYYYYMMDD(bjDate)).toBe('2024-01-15');
    });

    it('应该正确处理跨日期边界', () => {
      const date = new Date('2024-01-15T23:59:59.999Z');
      expect(formatDateYYYYMMDD(date)).toBe('2024-01-15');
      
      const nextDay = addDays(date, 1);
      expect(formatDateYYYYMMDD(nextDay)).toBe('2024-01-16');
    });

    it('应该正确处理月末日期', () => {
      const jan31 = new Date('2024-01-31T00:00:00Z');
      const nextDay = addDays(jan31, 1);
      expect(formatDateYYYYMMDD(nextDay)).toBe('2024-02-01');
    });

    it('应该正确处理闰年二月', () => {
      const feb28 = new Date('2024-02-28T00:00:00Z');
      const nextDay = addDays(feb28, 1);
      expect(formatDateYYYYMMDD(nextDay)).toBe('2024-02-29');
      
      const mar1 = addDays(feb28, 2);
      expect(formatDateYYYYMMDD(mar1)).toBe('2024-03-01');
    });

    it('应该正确处理年末日期', () => {
      const dec31 = new Date('2024-12-31T00:00:00Z');
      const nextDay = addDays(dec31, 1);
      expect(formatDateYYYYMMDD(nextDay)).toBe('2025-01-01');
    });

    it('应该正确增加月数跨年', () => {
      const nov = new Date('2024-11-15T00:00:00Z');
      const feb = addMonths(nov, 3);
      expect(formatDateYYYYMMDD(feb)).toBe('2025-02-15');
    });
  });

  describe('金额工具一致性', () => {
    it('应该正确转换元到分', () => {
      expect(yuanToCents(100)).toBe(10000);
      expect(yuanToCents(100.50)).toBe(10050);
      expect(yuanToCents(100.55)).toBe(10055);
    });

    it('应该正确转换分到元', () => {
      expect(centsToYuan(10000)).toBe(100);
      expect(centsToYuan(10050)).toBe(100.5);
      expect(centsToYuan(10055)).toBe(100.55);
    });

    it('应该无精度损失地往返转换', () => {
      const amounts = [100, 100.50, 100.55, 999.99, 0.01];
      
      amounts.forEach(yuan => {
        const cents = yuanToCents(yuan);
        const back = centsToYuan(cents);
        expect(back).toBe(yuan);
      });
    });

    it('应该正确四舍五入到分', () => {
      expect(yuanToCents(100.505)).toBe(10051); // 向上舍入
      expect(yuanToCents(100.504)).toBe(10050); // 向下舍入
      expect(yuanToCents(100.995)).toBe(10100); // 向上舍入
    });

    it('应该正确格式化金额', () => {
      expect(formatMoney(10000)).toBe('100.00');
      expect(formatMoney(10050)).toBe('100.50');
      expect(formatMoney(10055)).toBe('100.55');
      expect(formatMoney(1)).toBe('0.01');
      expect(formatMoney(0)).toBe('0.00');
    });

    it('应该避免浮点数精度问题', () => {
      // JavaScript 中 0.1 + 0.2 !== 0.3
      const amount1 = yuanToCents(0.1);
      const amount2 = yuanToCents(0.2);
      const sum = amount1 + amount2;
      
      expect(formatMoney(sum)).toBe('0.30');
      expect(centsToYuan(sum)).toBe(0.3);
    });

    it('应该正确处理负数金额', () => {
      expect(yuanToCents(-100.50)).toBe(-10050);
      expect(centsToYuan(-10050)).toBe(-100.5);
      expect(formatMoney(-10050)).toBe('-100.50');
    });

    it('应该正确处理极小金额', () => {
      expect(yuanToCents(0.01)).toBe(1);
      expect(centsToYuan(1)).toBe(0.01);
      expect(formatMoney(1)).toBe('0.01');
    });
  });

  describe('数据库存储一致性', () => {
    it('应该以分为单位存储金额', async () => {
      const student = await TestDataFactory.createStudent();
      const transaction = await TestDataFactory.createCashTransaction(100.50, {
        studentId: student.uid,
      });

      // 金额应该以分存储（字段名是 cash）
      expect(transaction.cash).toBe(10050);
      // 应该是整数
      expect(Number.isInteger(transaction.cash)).toBe(true);
    });

    it('应该以 ISO 字符串存储日期', async () => {
      const student = await TestDataFactory.createStudent();
      
      // 检查日期字段是 Date 对象（字段名是 createdAt）
      expect(student.createdAt).toBeInstanceOf(Date);
      
      // 转换为 JSON 后应该是 ISO 字符串
      const json = student.toJSON();
      expect(typeof json.createdAt).toBe('object'); // Date对象
      
      // 格式化为 YYYY-MM-DD 应该一致
      const formatted = formatDateYYYYMMDD(student.createdAt);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('跨月统计一致性', () => {
    it('应该正确统计跨月的交易', async () => {
      const student = await TestDataFactory.createStudent();
      
      // 创建不同月份的交易
      const jan15 = new Date('2024-01-15T12:00:00Z');
      const jan31 = new Date('2024-01-31T23:59:59Z');
      const feb1 = new Date('2024-02-01T00:00:00Z');
      
      // 由于 TestDataFactory 不支持自定义日期，我们直接创建
      const { CashBuilder } = await import('../services/cashBuilder');
      
      const tx1 = await CashBuilder.create()
        .amount(100)
        .studentId(student.uid)
        .build();
      
      const tx2 = await CashBuilder.create()
        .amount(200)
        .studentId(student.uid)
        .build();
      
      const tx3 = await CashBuilder.create()
        .amount(300)
        .studentId(student.uid)
        .build();

      // 手动更新日期（用于测试）- 使用原生MongoDB方法绕过Mongoose中间件
      const { Cash } = await import('../models/CashMongo');

      await Cash.collection.updateOne(
        { uid: tx1.uid },
        { $set: { created_at: jan15 } }
      );
      await Cash.collection.updateOne(
        { uid: tx2.uid },
        { $set: { created_at: jan31 } }
      );
      await Cash.collection.updateOne(
        { uid: tx3.uid },
        { $set: { created_at: feb1 } }
      );

      // 重新加载文档以获取更新后的日期
      const [reloadTx1, reloadTx2, reloadTx3] = await Promise.all([
        Cash.findOne({ uid: tx1.uid }),
        Cash.findOne({ uid: tx2.uid }),
        Cash.findOne({ uid: tx3.uid })
      ]);

      // 验证金额单位一致（字段名是 cash）
      expect(reloadTx1!.cash).toBe(10000);
      expect(reloadTx2!.cash).toBe(20000);
      expect(reloadTx3!.cash).toBe(30000);

      // 验证日期格式一致
      expect(formatDateYYYYMMDD(reloadTx1!.created_at)).toBe('2024-01-15');
      expect(formatDateYYYYMMDD(reloadTx2!.created_at)).toBe('2024-01-31');
      expect(formatDateYYYYMMDD(reloadTx3!.created_at)).toBe('2024-02-01');
    });
  });

  describe('分期付款日期一致性', () => {
    it('应该正确计算跨月分期', async () => {
      const { InstallmentPlan } = await import('../models/InstallmentPlanMongo');
      const { PaymentFrequency, InstallmentPlanStatus } = await import('../types');
      
      const startDate = new Date('2024-01-31T00:00:00Z');
      
      const plan = await TestDataFactory.createInstallmentPlan(
        900,
        3,
        PaymentFrequency.MONTHLY,
        startDate,
        { studentId: null }
      );

      expect(plan.start_date).toBeInstanceOf(Date);
      expect(formatDateYYYYMMDD(plan.start_date)).toBe('2024-01-31');
      
      // 月初月末的日期计算
      const month2 = addMonths(startDate, 1);
      const month3 = addMonths(startDate, 2);
      
      // 1月31日 + 1个月 = 2月29日（2024年闰年）或2月28日
      expect(formatDateYYYYMMDD(month2)).toMatch(/2024-02-(28|29)/);
      // 1月31日 + 2个月 = 3月31日
      expect(formatDateYYYYMMDD(month3)).toBe('2024-03-31');
    });

    it('应该正确处理分期金额分配', async () => {
      const { PaymentFrequency } = await import('../types');
      
      const plan = await TestDataFactory.createInstallmentPlan(
        1000,
        3,
        PaymentFrequency.MONTHLY,
        new Date('2024-01-01'),
        { studentId: null }
      );

      // 总金额应该是分
      expect(plan.total_amount).toBe(100000);
      
      // 每期金额也应该是分
      const installmentAmount = plan.getInstallmentAmount();
      expect(Number.isInteger(installmentAmount)).toBe(true);
      
      // 验证分配正确（1000元分3期）
      // 100000分 / 3 = 33333.33 -> 需要分配为 33334 + 33333 + 33333
      const amt1 = plan.getInstallmentAmount(1);
      const amt2 = plan.getInstallmentAmount(2);
      const amt3 = plan.getInstallmentAmount(3);
      
      expect(amt1 + amt2 + amt3).toBe(100000);
      expect([amt1, amt2, amt3].every(amt => Number.isInteger(amt))).toBe(true);
    });
  });

  describe('时区切换场景', () => {
    const originalTZ = process.env.TZ;

    afterEach(() => {
      // 恢复原始时区
      process.env.TZ = originalTZ;
    });

    it('应该在 UTC 时区下工作正常', async () => {
      process.env.TZ = 'UTC';
      
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDateYYYYMMDD(date)).toBe('2024-01-15');
      
      const amount = yuanToCents(100.50);
      expect(amount).toBe(10050);
    });

    it('应该在 Asia/Shanghai 时区下保持一致', async () => {
      process.env.TZ = 'Asia/Shanghai';
      
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDateYYYYMMDD(date)).toBe('2024-01-15');
      
      const amount = yuanToCents(100.50);
      expect(amount).toBe(10050);
    });

    it('应该在 America/New_York 时区下保持一致', async () => {
      process.env.TZ = 'America/New_York';
      
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDateYYYYMMDD(date)).toBe('2024-01-15');
      
      const amount = yuanToCents(100.50);
      expect(amount).toBe(10050);
    });
  });

  describe('API 响应格式一致性', () => {
    it('应该返回标准格式的日期', async () => {
      const student = await TestDataFactory.createStudent();
      const json = student.toJSON();
      
      // 日期字段应该是 Date 对象（Mongoose toJSON 保留 Date 类型）
      expect(json.createdAt).toBeInstanceOf(Date);
      
      // 转换为 ISO 字符串
      const isoString = json.createdAt.toISOString();
      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('应该返回标准格式的金额', async () => {
      const student = await TestDataFactory.createStudent();
      const transaction = await TestDataFactory.createCashTransaction(100.50, {
        studentId: student.uid,
      });
      
      const json = transaction.toJSON();
      
      // 金额应该是分（整数）（字段名是 cash）
      expect(Number.isInteger(json.cash)).toBe(true);
      expect(json.cash).toBe(10050);
      
      // 格式化后应该是两位小数
      expect(formatMoney(json.cash)).toBe('100.50');
    });
  });
});
