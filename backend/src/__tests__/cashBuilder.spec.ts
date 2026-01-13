/**
 * CashBuilder 测试
 *
 * 测试交易构建器的所有功能：
 * - 金额转换（元->分）
 * - 学员验证
 * - 备注处理
 */

import { CashBuilder, convertAmountToCents } from '@/services/cashBuilder';
import { setupTestDatabase, clearAllData, createTestStudent } from './fixtures';

describe('CashBuilder', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllData();
  });

  afterAll(async () => {
    // 清理工作由全局设置处理
  });

  describe('金额转换', () => {
    describe('convertAmountToCents', () => {
      it('正数金额正确转换', () => {
        expect(convertAmountToCents(100)).toBe(10000);
        expect(convertAmountToCents(50.5)).toBe(5050);
        expect(convertAmountToCents(0.01)).toBe(1);
        expect(convertAmountToCents('99.99')).toBe(9999);
      });

      it('负数金额正确转换（支出）', () => {
        expect(convertAmountToCents(-100)).toBe(-10000);
        expect(convertAmountToCents(-50.5)).toBe(-5050);
      });

      it('零金额抛出错误', () => {
        expect(() => convertAmountToCents(0)).toThrow(/金额不能为0/);
        expect(() => convertAmountToCents('0')).toThrow(/金额不能为0/);
      });

      it('无效金额抛出错误', () => {
        expect(() => convertAmountToCents('invalid')).toThrow(/金额必须是数字/);
        expect(() => convertAmountToCents(NaN)).toThrow(/金额必须是数字/);
        expect(() => convertAmountToCents(Infinity)).toThrow(/金额必须是数字/);
      });

      it('超过两位小数抛出错误', () => {
        expect(() => convertAmountToCents(123.456)).toThrow(/金额最多保留两位小数/);
        expect(() => convertAmountToCents(0.001)).toThrow(/金额最多保留两位小数/);
      });
    });
  });

  describe('静态工厂方法', () => {
    it('create() 返回新的构建器实例', () => {
      const builder = CashBuilder.create();
      expect(builder).toBeInstanceOf(CashBuilder);
    });
  });

  describe('流畅API - 链式调用', () => {
    it('支持链式调用所有方法', async () => {
      const student = await createTestStudent({ name: 'Test' });
      const transaction = await CashBuilder.create()
        .amount(100)
        .studentId(student.uid)
        .note('Test Transaction')
        .build();

      expect(transaction.amount).toBe(10000); // 100元 = 10000分
      expect(transaction.studentId).toBe(student.uid);
      expect(transaction.note).toBe('Test Transaction');
    });
  });

  describe('学员验证', () => {
    it('不存在的学员ID抛出错误', async () => {
      await expect(
        CashBuilder.create()
          .amount(100)
          .studentId(99999)
          .build()
      ).rejects.toMatchObject({
        message: expect.stringContaining('学员不存在'),
      });
    });

    it('无效的学员ID格式抛出错误', () => {
      expect(() => {
        CashBuilder.create().amount(100).studentId(-1);
      }).toThrow(/学员ID必须为正整数/);

      expect(() => {
        CashBuilder.create().amount(100).studentId(0);
      }).toThrow(/学员ID必须为正整数/);

      expect(() => {
        CashBuilder.create().amount(100).studentId(1.5);
      }).toThrow(/学员ID必须为正整数/);
    });

    it('null学员ID允许（非学员交易）', async () => {
      const transaction = await CashBuilder.create()
        .amount(100)
        .studentId(null)
        .build();

      expect(transaction.studentId).toBeNull();
    });
  });

  describe('备注处理', () => {
    it('空备注转换为null', async () => {
      const transaction = await CashBuilder.create()
        .amount(50)
        .note('')
        .build();

      expect(transaction.note).toBeNull();
    });

    it('仅空白字符的备注转换为null', async () => {
      const transaction = await CashBuilder.create()
        .amount(50)
        .note('   ')
        .build();

      expect(transaction.note).toBeNull();
    });

    it('正常备注保持原样', async () => {
      const transaction = await CashBuilder.create()
        .amount(50)
        .note('Normal note')
        .build();

      expect(transaction.note).toBe('Normal note');
    });

    it('备注自动trim', async () => {
      const transaction = await CashBuilder.create()
        .amount(50)
        .note('  Trimmed note  ')
        .build();

      expect(transaction.note).toBe('Trimmed note');
    });
  });

  describe('收入和支出', () => {
    it('正数金额创建收入交易', async () => {
      const transaction = await CashBuilder.create()
        .amount(100)
        .note('Income')
        .build();

      expect(transaction.amount).toBe(10000);
      expect(transaction.amount).toBeGreaterThan(0);
    });

    it('负数金额创建支出交易', async () => {
      const transaction = await CashBuilder.create()
        .amount(-50)
        .note('Expense')
        .build();

      expect(transaction.amount).toBe(-5000);
      expect(transaction.amount).toBeLessThan(0);
    });
  });

  describe('分期快照', () => {
    it('可以创建分期快照', () => {
      const snapshot = CashBuilder.createInstallmentSnapshot(
        1, // planUid
        2, // installmentUid
        {
          installment_number: 1,
          total_installments: 12,
          status: 'PENDING',
          note: 'Test installment',
        }
      );

      expect(snapshot.plan_uid).toBe(1);
      expect(snapshot.installment_uid).toBe(2);
      expect(snapshot.installment_number).toBe(1);
      expect(snapshot.total_installments).toBe(12);
      expect(snapshot.status).toBe('PENDING');
      expect(snapshot.note).toBe('Test installment');
    });

    it('分期快照可包含null字段', () => {
      const snapshot = CashBuilder.createInstallmentSnapshot(1);

      expect(snapshot.plan_uid).toBe(1);
      expect(snapshot.installment_uid).toBeNull();
      expect(snapshot.installment_number).toBeNull();
    });
  });
});
