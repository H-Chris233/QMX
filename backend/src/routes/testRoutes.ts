import { Router } from 'express';
import { studentModel } from '../models/mongo';
import { Cash } from '../models/CashMongo';
import { InstallmentModel } from '../models/InstallmentMongo';

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
    await studentModel.deleteMany({});
    await Cash.deleteMany({});
    await InstallmentModel.deleteMany({});
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
        email: 'test1@example.com',
        idCard: '110101199001011234',
        gender: '男',
        birthday: new Date('1990-01-01'),
        address: '北京市朝阳区测试地址1',
        registrationDate: new Date(),
        membershipType: 'basic',
        status: 'active',
      },
      {
        name: '测试学生2',
        phone: '13800138002',
        email: 'test2@example.com',
        idCard: '110101199002021234',
        gender: '女',
        birthday: new Date('1990-02-02'),
        address: '北京市海淀区测试地址2',
        registrationDate: new Date(),
        membershipType: 'premium',
        status: 'active',
      },
      {
        name: '测试学生3',
        phone: '13800138003',
        email: 'test3@example.com',
        idCard: '110101199003031234',
        gender: '男',
        birthday: new Date('1990-03-03'),
        address: '北京市西城区测试地址3',
        registrationDate: new Date(),
        membershipType: 'vip',
        status: 'inactive',
      },
    ];

    const savedStudents = await studentModel.insertMany(testStudents);
    console.log(`创建了 ${savedStudents.length} 个测试学生`);

    // 创建示例财务记录
    const testCashRecords = [
      {
        student_id: savedStudents[0]._id,
        cash: 10000,
        note: '测试学生1学费缴纳',
        installment: null,
      },
      {
        student_id: savedStudents[1]._id,
        cash: 15000,
        note: '测试学生2学费缴纳',
        installment: null,
      },
      {
        student_id: null,
        cash: -500,
        note: '测试办公用品购买',
        installment: null,
      },
    ];

    const savedCashRecords = await Cash.insertMany(testCashRecords);
    console.log(`创建了 ${savedCashRecords.length} 个测试财务记录`);

    // 创建示例分期付款记录
    const testInstallments = [
      {
        plan_id: 1,
        installment_amount: 2000,
        current_installment: 2,
        total_installments: 6,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        paid_amount: 4000,
        student_id: savedStudents[0].uid,
        cash_uid: null,
      },
    ];

    const savedInstallments = await InstallmentModel.insertMany(testInstallments);
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
    const studentCount = await studentModel.countDocuments();
    const cashCount = await Cash.countDocuments();
    const installmentCount = await InstallmentModel.countDocuments();

    res.json({
      success: true,
      data: {
        students: studentCount,
        cashRecords: cashCount,
        installments: installmentCount,
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