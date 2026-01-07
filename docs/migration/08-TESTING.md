# 08 - 测试策略

## 1. 测试总览

### 1.1 测试金字塔

```
                  ┌─────────────────┐
                  │   E2E 测试       │  10% - 关键业务流程
                  └─────────────────┘
               ┌──────────────────┐
               │   集成测试        │  30% - API + 数据库
               └──────────────────┘
            ┌────────────────────┐
            │    单元测试         │  60% - 函数、工具、Repository
            └────────────────────┘
```

### 1.2 测试目标

| 层级 | 目标 | 工具 |
|------|------|------|
| **单元测试** | 100% 覆盖率核心组件 | Vitest |
| **集成测试** | 关键业务流程验证 | Vitest + postgres-test |
| **E2E 测试** | 端到端业务验证 | Playwright |
| **性能测试** | API 响应时间对比 | autocannon |

---

## 2. 单元测试

### 2.1 Repository 层测试

```typescript
// backend/src/db/repositories/__tests__/studentRepository.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StudentRepository } from '../studentRepository';
import { db, students } from '../../index';
import { eq } from 'drizzle-orm';

describe('StudentRepository', () => {
  let testStudent: any;

  beforeEach(async () => {
    // 清理测试数据
    await db.delete(students);

    // 创建测试数据
    testStudent = await StudentRepository.create({
      name: '测试学员',
      age: 20,
      phone: '13800138000',
      classType: 'MONTH',
      subject: 'SHOOTING',
    });
  });

  afterEach(async () => {
    // 清理测试数据
    await db.delete(students);
  });

  describe('findByUid', () => {
    it('应该找到已存在的学员', async () => {
      const student = await StudentRepository.findByUid(testStudent.uid);
      expect(student).not.toBeNull();
      expect(student?.name).toBe('测试学员');
    });

    it('应该返回 null 如果学员不存在', async () => {
      const student = await StudentRepository.findByUid(99999);
      expect(student).toBeNull();
    });
  });

  describe('create', () => {
    it('应该创建新学员', async () => {
      const newStudent = await StudentRepository.create({
        name: '新学员',
        age: 25,
        phone: '13900139000',
        classType: 'YEAR',
        subject: 'ARCHERY',
      });

      expect(newStudent).toBeDefined();
      expect(newStudent.uid).toBeDefined();
      expect(newStudent.name).toBe('新学员');
    });

    it('应该添加成绩', async () => {
      const newStudent = await StudentRepository.create({
        name: '新学员',
        age: 22,
        phone: '13700137000',
        classType: 'MONTH',
        subject: 'SHOOTING',
        rings: [85.5, 90.0, 88.5],
      });

      expect(newStudent.rings).toEqual([85.5, 90.0, 88.5]);
    });
  });

  describe('updateByUid', () => {
    it('应该更新学员信息', async () => {
      const updated = await StudentRepository.updateByUid(testStudent.uid, {
        name: '更新后的名字',
        age: 21,
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('更新后的名字');
      expect(updated?.age).toBe(21);
    });

    it('应该更新成绩', async () => {
      const rings = [90.0, 95.5, 92.0];
      const updated = await StudentRepository.updateByUid(testStudent.uid, {
        rings,
      });

      expect(updated?.rings).toEqual(rings);
    });

    it('应该返回 null 如果学员不存在', async () => {
      const updated = await StudentRepository.updateByUid(99999, {
        name: '测试',
      });
      expect(updated).toBeNull();
    });
  });

  describe('deleteByUid', () => {
    it('应该删除学员', async () => {
      const result = await StudentRepository.deleteByUid(testStudent.uid);
      expect(result).toBe(true);

      // 验证已删除
      const student = await StudentRepository.findByUid(testStudent.uid);
      expect(student).toBeNull();
    });

    it('应该返回 false 如果学员不存在', async () => {
      const result = await StudentRepository.deleteByUid(99999);
      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // 创建多个测试学员
      await StudentRepository.create({ name: '张三', age: 18, phone: '13800000001', classType: 'MONTH', subject: 'SHOOTING' });
      await StudentRepository.create({ name: '张四', age: 20, phone: '13800000002', classType: 'YEAR', subject: 'SHOOTING' });
      await StudentRepository.create({ name: '李三', age: 19, phone: '13800000003', classType: 'MONTH', subject: 'ARCHERY' });
    });

    it('应该按姓名搜索', async () => {
      const results = await StudentRepository.search({
        name_contains: '张',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(s => s.name.includes('张'))).toBe(true);
    });

    it('应该按年龄范围搜索', async () => {
      const results = await StudentRepository.search({
        min_age: 18,
        max_age: 20,
      });

      expect(results.every(s => s.age! >= 18 && s.age! <= 20)).toBe(true);
    });

    it('应该按班级类型搜索', async () => {
      const results = await StudentRepository.search({
        class_type: 'MONTH',
      });

      expect(results.every(s => s.classType === 'MONTH')).toBe(true);
    });
  });

  describe('findWithPagination', () => {
    beforeEach(async () => {
      // 创建 25 个学员
      for (let i = 1; i <= 25; i++) {
        await StudentRepository.create({
          name: `学员${i}`,
          age: 20,
          phone: `1380000${String(i).padStart(4, '0')}`,
          classType: 'MONTH',
          subject: 'SHOOTING',
        });
      }
    });

    it('应该返回分页结果', async () => {
      const result = await StudentRepository.findWithPagination({
        page: 1,
        limit: 10,
      });

      expect(result.data.length).toBe(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.total_pages).toBe(3);
    });

    it('应该返回第二页结果', async () => {
      const result = await StudentRepository.findWithPagination({
        page: 2,
        limit: 10,
      });

      expect(result.data.length).toBe(10);
      expect(result.pagination.page).toBe(2);
    });
  });

  describe('addScore', () => {
    it('应该添加成绩', async () => {
      const newRings = await StudentRepository.addScore(testStudent.uid, 95.5);

      expect(newRings).not.toBeNull();
      expect(newRings).toContain(95.5);
    });

    it('应该返回 null 如果学员不存在', async () => {
      const newRings = await StudentRepository.addScore(99999, 90.0);
      expect(newRings).toBeNull();
    });
  });
});
```

### 2.2 Service 层测试

```typescript
// backend/src/services/__tests__/statsService.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { StatsService } from '../statsService';
import { db, students, cashTransactions, installmentPlans, installments } from '../db';
import { eq, and } from 'drizzle-orm';

describe('StatsService', () => {
  let testStudent: any;

  beforeEach(async () => {
    // 清理所有数据
    await db.delete(installments);
    await db.delete(installmentPlans);
    await db.delete(cashTransactions);
    await db.delete(students);

    // 创建测试学员
    testStudent = await db.insert(students).values({
      name: '测试学员',
      age: 20,
      phone: '13800138000',
      classType: 'MONTH',
      subject: 'SHOOTING',
      rings: [85.5, 90.0, 88.5],
    }).returning().then(r => r[0]);

    // 创建测试交易数据
    await db.insert(cashTransactions).values([
      { studentId: testStudent.uid, amount: 30000, note: '缴费1' },  // +300元
      { studentId: testStudent.uid, amount: 20000, note: '缴费2' },  // +200元
      { studentId: testStudent.uid, amount: -5000, note: '退款' },   // -50元
    ]);
  });

  describe('buildDashboardStats', () => {
    it('应该返回正确的仪表盘统计', async () => {
      const stats = await StatsService.buildDashboardStats();

      expect(stats).toBeDefined();
      expect(stats.totalStudents).toBeGreaterThanOrEqual(1);
      expect(stats.totalRevenue).toBe(50000); // 300 + 200 = 500元
      expect(stats.totalExpense).toBe(5000);  // 50元
      expect(stats.netIncome).toBe(45000);    // 500 - 50 = 450元
    });

    it('应该按日期范围过滤', async () => {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const stats = await StatsService.buildDashboardStats({
        start: startDate,
        end: endDate,
      });

      // 今天的交易应该全部包含在内
      expect(stats).toBeDefined();
    });
  });

  describe('buildStudentStats', () => {
    it('应该返回学员统计', async () => {
      const stats = await StatsService.buildStudentStats(testStudent.uid);

      expect(stats).toBeDefined();
      expect(stats.student).toBeDefined();
      expect(stats.student.uid).toBe(testStudent.uid);
      expect(stats.stats.totalPayments).toBe(50000);  // 500元
      expect(stats.stats.totalExpenses).toBe(5000);   // 50元
      expect(stats.stats.paymentCount).toBe(3);
      expect(stats.stats.averageScore).toBe('88.0');  // (85.5 + 90 + 88.5) / 3
      expect(stats.stats.maxScore).toBe(90);
    });

    it('应该抛出错误如果学员不存在', async () => {
      await expect(
        StatsService.buildStudentStats(99999)
      ).rejects.toThrow('学员不存在');
    });
  });

  describe('buildFinancialStats', () => {
    it('应该返回财务统计', async () => {
      const stats = await StatsService.buildFinancialStats();

      expect(stats).toBeDefined();
      expect(stats.summary).toBeDefined();
      expect(stats.summary.totalIncome).toBe(50000);
      expect(stats.summary.totalExpense).toBe(5000);
      expect(stats.summary.netIncome).toBe(45000);
      expect(stats.summary.transactionCount).toBe(3);
    });

    it('应该包含学员收入排名', async () => {
      const stats = await StatsService.buildFinancialStats();

      expect(stats.topStudents).toBeDefined();
      expect(stats.topStudents.length).toBeGreaterThan(0);
      expect(stats.topStudents[0].studentId).toBe(testStudent.uid);
      expect(stats.topStudents[0].totalAmount).toBe(50000);
    });
  });
});
```

### 2.3 事务测试

```typescript
// backend/src/controllers/__tests__/installment.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { InstallmentController } from '../installmentController';
import { db, students, installmentPlans, installments, cashTransactions } from '../../db';
import { eq } from 'drizzle-orm';

describe('InstallmentController - 事务测试', () => {
  let testStudent: any;

  beforeEach(async () => {
    // 清理
    await db.delete(installments);
    await db.delete(installmentPlans);
    await db.delete(cashTransactions);
    await db.delete(students);

    // 创建学员
    testStudent = await db.insert(students).values({
      name: '测试学员',
      age: 20,
      phone: '13800138000',
      classType: 'MONTH',
      subject: 'SHOOTING',
    }).returning().then(r => r[0]);
  });

  describe('createInstallmentPlan', () => {
    it('应该在事务中创建完整的分期计划', async () => {
      // 模拟请求数据
      const req = {
        body: {
          student_id: testStudent.uid,
          total_amount: 6000,  // 600元，6期，每期100元
          total_installments: 6,
          down_payment: 0,
          frequency: 'MONTHLY',
        },
      };

      // 执行 (简化，实际需要构造 res, next)
      // 这里直接测试事务逻辑

      const result = await db.transaction(async (tx) => {
        // 创建计划
        const [plan] = await tx.insert(installmentPlans).values({
          studentId: testStudent.uid,
          totalAmount: 600000,  // 转为分
          downPayment: 0,
          totalInstallments: 6,
          frequency: 'MONTHLY',
          status: 'ACTIVE',
        }).returning();

        // 创建分期
        const installmentRecords = Array.from({ length: 6 }, (_, i) => ({
          planId: plan.uid,
          studentId: testStudent.uid,
          installmentNumber: i + 1,
          installmentAmount: 100000,
          dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: i === 0 ? 'PAID' : 'PENDING',
        }));

        const installments = await tx.insert(installments).values(installmentRecords).returning();

        // 创建交易
        const [cash] = await tx.insert(cashTransactions).values({
          studentId: testStudent.uid,
          amount: 100000,
          note: '首期付款',
          installmentSnapshot: {
            plan_uid: plan.uid,
            installment_uid: installments[0].uid,
            installment_number: 1,
            total_installments: 6,
            due_date: installments[0].dueDate,
            status: 'PAID',
            note: null,
          },
        }).returning();

        // 更新首期的 cash_uid
        await tx.update(installments)
          .set({ cashUid: cash.uid })
          .where(eq(installments.uid, installments[0].uid));

        return { plan, installments, cash };
      });

      // 验证
      expect(result.plan).toBeDefined();
      expect(result.installments).toHaveLength(6);
      expect(result.cash).toBeDefined();

      // 验证数据一致性
      const planInDb = await db.select().from(installmentPlans)
        .where(eq(installmentPlans.uid, result.plan.uid)).limit(1).then(r => r[0]);

      expect(planInDb).toBeDefined();
      expect(planInDb.status).toBe('ACTIVE');
    });

    it('应该在失败时回滚所有操作', async () => {
      const initialPlanCount = await db.select().from(installmentPlans).then(r => r.length);

      try {
        await db.transaction(async (tx) => {
          // 创建计划
          const [plan] = await tx.insert(installmentPlans).values({
            studentId: testStudent.uid,
            totalAmount: 600000,
            totalInstallments: 3,
            frequency: 'MONTHLY',
            status: 'ACTIVE',
          }).returning();

          // 创建分期
          await tx.insert(installments).values([
            { planId: plan.uid, studentId: testStudent.uid, installmentNumber: 1, installmentAmount: 200000, dueDate: '2025-01-01', status: 'PAID' },
            { planId: plan.uid, studentId: testStudent.uid, installmentNumber: 2, installmentAmount: 200000, dueDate: '2025-02-01', status: 'PENDING' },
          ]);

          // 创建交易
          await tx.insert(cashTransactions).values({
            studentId: testStudent.uid,
            amount: 200000,
            note: '测试',
          });

          // 故意抛出错误
          throw new Error('测试回滚');
        });
      } catch (error) {
        // 期望的错误
      }

      // 验证回滚：不应该有任何数据
      const planCount = await db.select().from(installmentPlans).then(r => r.length);
      const installmentCount = await db.select().from(installments).then(r => r.length);
      const cashCount = await db.select().from(cashTransactions).then(r => r.length);

      expect(planCount).toBe(initialPlanCount);
      expect(installmentCount).toBe(0);
      expect(cashCount).toBe(0);
    });
  });
});
```

---

## 3. 集成测试

### 3.1 API 端点测试

```typescript
// backend/src/__tests__/api/students.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { db, students } from '../db';
import { eq } from 'drizzle-orm';

describe('Student API', () => {
  let authToken: string;

  beforeAll(async () => {
    // 创建测试用户并获取 token
    // ...
  });

  describe('GET /api/v1/students', () => {
    it('应该返回学员列表', async () => {
      const response = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/v1/students?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('应该支持搜索', async () => {
      const response = await request(app)
        .get('/api/v1/students?name_contains=张')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/v1/students', () => {
    it('应该创建新学员', async () => {
      const newStudent = {
        name: '测试API',
        age: 22,
        phone: '13800138888',
        class: 'MONTH',
        subject: 'SHOOTING',
      };

      const response = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newStudent)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(newStudent.name);
      expect(response.body.data.uid).toBeDefined();
    });

    it('应该验证必填字段', async () => {
      const invalidStudent = {
        age: 22,
        phone: '13800138888',
      };

      const response = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidStudent)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('应该验证手机号格式', async () => {
      const invalidStudent = {
        name: '测试API',
        age: 22,
        phone: 'invalid-phone',
        class: 'MONTH',
        subject: 'SHOOTING',
      };

      const response = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidStudent)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/students/:uid', () => {
    it('应该更新学员', async () => {
      const testStudent = await db.insert(students).values({
        name: '测试更新',
        age: 20,
        phone: '13800139999',
        classType: 'MONTH',
        subject: 'SHOOTING',
      }).returning().then(r => r[0]);

      const updateData = { name: '已更新', age: 21 };

      const response = await request(app)
        .put(`/api/v1/students/${testStudent.uid}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('已更新');
      expect(response.body.data.age).toBe(21);

      // 清理
      await db.delete(students).where(eq(students.uid, testStudent.uid));
    });

    it('应该返回 404 如果学员不存在', async () => {
      const response = await request(app)
        .put('/api/v1/students/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '测试' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
```

---

## 4. 性能测试

### 4.1 API 性能基准

```typescript
// backend/src/__tests__/performance/bench.test.ts

import autocannon from 'autocannon';
import { expect, describe, it } from 'vitest';

describe('API 性能测试', () => {
  const BASE_URL = 'http://localhost:3001/api/v1';

  it('GET /students 应该在 100ms 内响应', async () => {
    const result = await autocannon({
      url: `${BASE_URL}/students`,
      connections: 10,
      duration: 5,
      amount: 100,
    });

    console.log('学员查询性能:', {
      latency: {
        avg: `${result.latency.mean.toFixed(2)}ms`,
        p95: `${result.latency.p95.toFixed(2)}ms`,
        p99: `${result.latency.p99.toFixed(2)}ms`,
      },
      requests: {
        total: result.requests.total,
        mean: `${result.requests.mean.toFixed(2)}/sec`,
      },
    });

    expect(result.latency.mean).toBeLessThan(100);
    expect(result.errors).toBe(0);
  });

  it('GET /stats/dashboard 应该在 200ms 内响应', async () => {
    const result = await autocannon({
      url: `${BASE_URL}/stats/dashboard`,
      connections: 10,
      duration: 5,
      amount: 100,
    });

    expect(result.latency.mean).toBeLessThan(200);
    expect(result.errors).toBe(0);
  });
});
```

---

## 5. E2E 测试

### 5.1 关键业务流程

```typescript
// tests/e2e/installment-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('分期付款业务流程', () => {
  test('完整创建分期计划并支付', async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 选择学员
    await page.click('text=学员管理');
    await page.click('data-testid=student-row-1');

    // 创建分期计划
    await page.click('text=创建分期计划');
    await page.fill('input[name="total_amount"]', '6000');
    await page.fill('input[name="total_installments"]', '6');
    await page.selectOption('select[name="frequency"]', 'monthly');
    await page.click('button:has-text("创建")');

    // 验证计划创建成功
    await expect(page.locator('text=分期计划已创建')).toBeVisible();

    // 查看详情
    await page.click('text=查看详情');
    await expect(page.locator('text=分期计划详情')).toBeVisible();

    // 支付第2期
    await page.click('data-testid=installment-2');
    await page.click('text=标记为已支付');
    await page.fill('input[name="payment_amount"]', '1000');
    await page.click('button:has-text("确认支付")');

    // 验证支付成功
    await expect(page.locator('text=支付成功')).toBeVisible();

    // 验证状态已更新
    const status = await page.locator('data-testid=installment-2-status').textContent();
    expect(status).toBe('已支付');
  });
});
```

---

## 6. 测试覆盖率目标

| 模块 | 目标覆盖率 | 必须覆盖 |
|------|-----------|---------|
| Repository 层 | 80%+ | CRUD、查询、事务 |
| Service 层 | 75%+ | 业务逻辑、统计计算 |
| Controller 层 | 60%+ | API 端点、错误处理 |
| 工具函数 | 90%+ | 数据转换、验证 |

### 6.1 覆盖率配置

```typescript
// backend/vitest.config.ts

import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'src/db/migrations/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
  plugins: [tsconfigPaths()],
});
```

---

## 7. 测试执行

### 7.1 package.json 脚本

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest watch",
    "test:coverage": "vitest --coverage",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:perf": "node tests/perf/bench.js"
  }
}
```

---

**下一步**: [09-ROLLBACK.md](./09-ROLLBACK.md) - 回滚方案
