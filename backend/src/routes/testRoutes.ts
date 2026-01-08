import { Router } from 'express';
import { db } from '../db';
import { students } from '../db/schema/students';
import { cashTransactions } from '../db/schema/cash';
import { installmentPlans, installments } from '../db/schema/installments';
import { eq, sql } from 'drizzle-orm';

const router = Router();

/**
 * 测试数据路由 - 仅在测试环境启用
 * 提供测试数据的准备和清理功能
 */

// 验证测试环境
const isTestEnvironment = () => {
  return process.env.NODE_ENV === 'test' || process.env.TEST_DATA_CLEANUP === 'true';
};

// 清空所有测试数据
const clearTestData = async () => {
  try {
    // 按正确顺序删除（因为有外键约束）
    await db.delete(installments);
    await db.delete(installmentPlans);
    await db.delete(cashTransactions);
    await db.delete(students);
    console.log('测试数据清理完成');
  } catch (error) {
    console.error('测试数据清理失败:', error);
    throw error;
  }
};

// 创建示例测试数据
const createTestData = async () => {
  try {
    // 创建示例学生
    const testStudents = [
      {
        name: '测试学生1',
        phone: '13800138001',
        classType: 'TEN_TRY' as const,
        subject: 'SHOOTING' as const,
        lessonLeft: 10,
        rings: [],
        note: '测试学生1',
        membershipStartDate: null,
        membershipEndDate: null,
      },
      {
        name: '测试学生2',
        phone: '13800138002',
        classType: 'MONTH' as const,
        subject: 'ARCHERY' as const,
        lessonLeft: 20,
        rings: [],
        note: '测试学生2',
        membershipStartDate: null,
        membershipEndDate: null,
      },
      {
        name: '测试学生3',
        phone: '13800138003',
        classType: 'YEAR' as const,
        subject: 'SHOOTING' as const,
        lessonLeft: 30,
        rings: [],
        note: '测试学生3',
        membershipStartDate: null,
        membershipEndDate: null,
      },
    ];

    const savedStudents = await db.insert(students).values(testStudents).returning();
    console.log(`创建了 ${savedStudents.length} 个测试学生`);

    // 创建示例财务记录
    const testCashRecords = [
      {
        studentId: savedStudents[0].uid,
        amount: 10000, // 单位：分
        note: '测试学生1学费缴纳',
        installmentSnapshot: null,
      },
      {
        studentId: savedStudents[1].uid,
        amount: 15000, // 单位：分
        note: '测试学生2学费缴纳',
        installmentSnapshot: null,
      },
      {
        studentId: null,
        amount: -500, // 单位：分
        note: '测试办公用品购买',
        installmentSnapshot: null,
      },
    ];

    const savedCashRecords = await db.insert(cashTransactions).values(testCashRecords).returning();
    console.log(`创建了 ${savedCashRecords.length} 个测试财务记录`);

    // 创建示例分期付款记录
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const testInstallmentPlans = [
      {
        studentId: savedStudents[0].uid,
        totalAmount: 12000, // 单位：分
        downPayment: 0,
        totalInstallments: 6,
        frequency: 'MONTHLY' as const,
        status: 'ACTIVE' as const,
        startDate: now,
        note: '测试分期计划',
      },
    ];

    const savedPlans = await db.insert(installmentPlans).values(testInstallmentPlans).returning();
    console.log(`创建了 ${savedPlans.length} 个测试分期计划`);

    const testInstallments = [
      {
        planId: savedPlans[0].uid,
        studentId: savedStudents[0].uid,
        installmentNumber: 1,
        installmentAmount: 2000,
        paidAmount: 0,
        dueDate: dueDate,
        status: 'PENDING' as const,
        note: '第1期',
      },
      {
        planId: savedPlans[0].uid,
        studentId: savedStudents[0].uid,
        installmentNumber: 2,
        installmentAmount: 2000,
        paidAmount: 2000,
        paidDate: now,
        status: 'PAID' as const,
        note: '第2期已支付',
      },
    ];

    const savedInstallments = await db.insert(installments).values(testInstallments).returning();
    console.log(`创建了 ${savedInstallments.length} 个测试分期记录`);

    return {
      students: savedStudents.length,
      cashRecords: savedCashRecords.length,
      installments: savedInstallments.length,
    };
  } catch (error) {
    console.error('测试数据创建失败:', error);
    throw error;
  }
};

// POST /test/seed - 准备测试数据
router.post('/seed', async (req, res) => {
  if (!isTestEnvironment()) {
    return res.status(403).json({
      success: false,
      error: '测试路由仅在测试环境可用',
    });
  }

  try {
    const { action = 'prepare' } = req.body;

    let result;
    switch (action) {
      case 'prepare':
        // 清空并重新创建测试数据
        await clearTestData();
        result = await createTestData();
        break;

      case 'clear':
        // 仅清空测试数据
        await clearTestData();
        result = { message: '测试数据已清空' };
        break;

      case 'create':
        // 仅创建测试数据
        result = await createTestData();
        break;

      default:
        return res.status(400).json({
          success: false,
          error: '不支持的操作',
        });
    }

    res.json({
      success: true,
      message: '测试数据准备完成',
      data: result,
    });
  } catch (error) {
    console.error('测试数据准备失败:', error);
    res.status(500).json({
      success: false,
      error: '测试数据准备失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// POST /test/cleanup - 清理测试数据
router.post('/cleanup', async (req, res) => {
  if (!isTestEnvironment()) {
    return res.status(403).json({
      success: false,
      error: '测试路由仅在测试环境可用',
    });
  }

  try {
    await clearTestData();

    res.json({
      success: true,
      message: '测试数据清理完成',
    });
  } catch (error) {
    console.error('测试数据清理失败:', error);
    res.status(500).json({
      success: false,
      error: '测试数据清理失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// GET /test/status - 获取测试数据状态
router.get('/status', async (req, res) => {
  if (!isTestEnvironment()) {
    return res.status(403).json({
      success: false,
      error: '测试路由仅在测试环境可用',
    });
  }

  try {
    const [studentCount] = await db.select({ count: sql<number>`count(*)` }).from(students);
    const [cashCount] = await db.select({ count: sql<number>`count(*)` }).from(cashTransactions);
    const [installmentCount] = await db.select({ count: sql<number>`count(*)` }).from(installments);

    res.json({
      success: true,
      data: {
        students: Number(studentCount.count) || 0,
        cashRecords: Number(cashCount.count) || 0,
        installments: Number(installmentCount.count) || 0,
        environment: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    console.error('获取测试数据状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取测试数据状态失败',
    });
  }
});

export default router;
