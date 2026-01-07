# 06 - 控制器层改造

## 1. 迁移策略

### 1.1 现有控制器结构

```
backend/src/controllers/
├── studentController.ts       # 学员管理
├── cashController.ts          # 交易管理
├── installmentController.ts   # 分期付款管理 (关键：事务)
├── statsController.ts         # 统计数据
├── membershipController.ts    # 会员管理
├── scoreController.ts         # 成绩管理
└── adapterController.ts       # 数据适配器
```

### 1.2 变更类型

| 控制器 | 变更类型 | 需要事务 |
|--------|----------|----------|
| **studentController.ts** | 适配新 Model/Service | 部分方法 |
| **cashController.ts** | 适配新 Model/Service | **创建分期** |
| **installmentController.ts** | 完全重写 + 事务 | **所有多步操作** |
| **statsController.ts** | 适配新 StatsService | 否 |
| **membershipController.ts** | 适配新 Model | 部分方法 |
| **scoreController.ts** | 适配新 Model | 否 |
| **adapterController.ts** | 适配新 Model | 否 |

---

## 2. 关键事务场景改造

### 2.1 创建分期付款计划 (最关键)

#### 原 Mongoose 实现 (无事务)

```typescript
// backend/src/controllers/cashController.ts (原代码)

async addInstallmentTransaction(req, res) {
  const { student_id, total_amount, total_installments, down_payment, frequency } = req.body;

  // 1. 验证学员
  const student = await Student.findByUid(student_id);

  // 2. 创建分期计划
  const plan = await InstallmentPlan.create({ ... });

  // 3. 循环创建分期记录
  const installments = [];
  for (let i = 1; i <= total_installments; i++) {
    const installment = await Installment.create({ ... });
    installments.push(installment);
  }

  // 4. 创建首期交易记录
  const cashRecord = await CashBuilder.create()
    .studentId(student_id)
    .amount(down_payment + installment_amount)
    .build();

  // 5. 更新首期分期状态
  const paidInstallment = await Installment.updateByUid(
    installment.uid,
    { status: 'PAID', cash_uid: cashRecord.uid }
  );

  // 6. 如果只有一期，完成计划
  if (total_installments === 1) {
    await InstallmentPlan.updateByUid(plan.uid, { status: 'COMPLETED' });
  }

  // ⚠️ 问题：步骤4失败 -> 数据不一致
}
```

#### 新 PostgreSQL 实现 (带事务)

```typescript
// backend/src/controllers/installmentController.ts (新代码)

import { db } from '../db';
import {
  InstallmentPlanRepository,
  InstallmentRepository
} from '../db/repositories/installmentRepository';
import { StudentRepository } from '../db/repositories/studentRepository';
import { CashRepository } from '../db/repositories/cashRepository';

export class InstallmentController {
  /**
   * 创建分期付款计划 - 使用事务
   */
  static async createInstallmentPlan(req, res, next) {
    try {
      const {
        student_id,
        total_amount,
        total_installments,
        down_payment = 0,
        frequency = 'MONTHLY',
        start_date,
        note,
      } = req.body;

      // 验证输入
      if (!student_id) {
        throw AppError.badRequest('学员ID不能为空');
      }
      if (!total_amount || total_amount <= 0) {
        throw AppError.badRequest('总金额必须大于0');
      }
      if (!total_installments || total_installments <= 0) {
        throw AppError.badRequest('分期数必须大于0');
      }

      // 使用事务
      const result = await db.transaction(async (tx) => {
        // 1. 验证学员存在
        const student = await StudentRepository.findByUid(student_id);
        if (!student) {
          throw AppError.notFound('学员不存在');
        }

        // 2. 创建分期计划
        const planData = {
          studentId: student_id,
          totalAmount: Math.round(total_amount * 100), // 转为分
          downPayment: Math.round(down_payment * 100),
          totalInstallments,
          frequency,
          status: 'ACTIVE',
          startDate: start_date || new Date().toISOString().split('T')[0],
          note,
        };

        const plan = await tx.insert(installmentPlans).values(planData).returning();
        const createdPlan = plan[0];

        // 3. 计算每期金额
        const remainingAmount = createdPlan.totalAmount - createdPlan.downPayment;
        const baseInstallmentAmount = Math.ceil(remainingAmount / total_installments);

        // 4. 创建分期记录
        const installmentRecords = [];
        for (let i = 1; i <= total_installments; i++) {
          const dueDate = this.calculateDueDate(
            createdPlan.startDate,
            i,
            frequency
          );

          // 最后一期可能金额不同
          const installmentAmount = i === total_installments
            ? remainingAmount - baseInstallmentAmount * (total_installments - 1)
            : baseInstallmentAmount;

          installmentRecords.push({
            planId: createdPlan.uid,
            studentId: student_id,
            installmentNumber: i,
            installmentAmount,
            dueDate,
            status: i === 1 ? 'PAID' : 'PENDING',
            paidDate: i === 1 ? new Date().toISOString().split('T')[0] : null,
          });
        }

        const createdInstallments = await tx
          .insert(installments)
          .values(installmentRecords)
          .returning();

        // 5. 创建首期交易记录
        const firstInstallment = createdInstallments[0];
        const totalFirstPayment = createdPlan.downPayment + firstInstallment.installmentAmount;

        const cashData = {
          studentId: student_id,
          amount: totalFirstPayment,
          note: `分期计划首付 + 第1期缴费`,
          installmentSnapshot: {
            plan_uid: createdPlan.uid,
            installment_uid: firstInstallment.uid,
            installment_number: 1,
            total_installments: total_installments,
            due_date: firstInstallment.dueDate,
            status: 'PAID',
            note: null,
          },
        };

        const cashRecord = await tx.insert(cashTransactions).values(cashData).returning();
        const createdCash = cashRecord[0];

        // 6. 更新首期分期的 cashUid
        await tx
          .update(installments)
          .set({
            cashUid: createdCash.uid,
            paidDate: new Date().toISOString().split('T')[0],
          })
          .where(eq(installments.uid, firstInstallment.uid));

        // 7. 如果只有一期，立即完成计划
        if (total_installments === 1) {
          await tx
            .update(installmentPlans)
            .set({ status: 'COMPLETED' })
            .where(eq(installmentPlans.uid, createdPlan.uid));
        }

        return {
          plan: createdPlan,
          installments: createdInstallments,
          cashRecord: createdCash,
        };
      });

      // 响应
      res.json({
        success: true,
        data: {
          plan: result.plan,
          installments: result.installments,
          cash_record: result.cashRecord,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 支付分期付款 - 使用事务
   */
  static async recordPayment(req, res, next) {
    try {
      const { plan_id, installment_uid } = req.body;

      const result = await db.transaction(async (tx) => {
        // 1. 获取分期记录
        const [installment] = await tx
          .select()
          .from(installments)
          .where(eq(installments.uid, installment_uid))
          .limit(1);

        if (!installment) {
          throw AppError.notFound('分期记录不存在');
        }
        if (installment.status === 'PAID') {
          throw AppError.badRequest('该分期已支付');
        }

        // 2. 获取分期计划
        const [plan] = await tx
          .select()
          .from(installmentPlans)
          .where(eq(installmentPlans.uid, installment.planId))
          .limit(1);

        if (!plan) {
          throw AppError.notFound('分期计划不存在');
        }

        // 3. 如果已有旧的交易记录，删除它
        if (installment.cashUid) {
          await tx
            .delete(cashTransactions)
            .where(eq(cashTransactions.uid, installment.cashUid));
        }

        // 4. 创建新的交易记录
        const cashData = {
          studentId: installment.studentId,
          amount: installment.installmentAmount,
          note: `分期计划第${installment.installmentNumber}期付款`,
          installmentSnapshot: {
            plan_uid: plan.uid,
            installment_uid: installment.uid,
            installment_number: installment.installmentNumber,
            total_installments: plan.totalInstallments,
            due_date: installment.dueDate,
            status: 'PAID',
            note: null,
          },
        };

        const [cashRecord] = await tx
          .insert(cashTransactions)
          .values(cashData)
          .returning();

        // 5. 更新分期状态
        await tx
          .update(installments)
          .set({
            status: 'PAID',
            cashUid: cashRecord.uid,
            paidDate: new Date().toISOString().split('T')[0],
          })
          .where(eq(installments.uid, installment.uid));

        // 6. 刷新计划状态
        await this.refreshPlanStatus(tx, plan.uid);

        return { installment, cashRecord, plan };
      });

      res.json({
        success: true,
        data: {
          installment: result.installment,
          cash_record: result.cashRecord,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除分期计划 - 使用事务
   */
  static async deleteInstallmentPlan(req, res, next) {
    try {
      const { uid } = req.params;

      await db.transaction(async (tx) => {
        // 1. 验证计划存在
        const [plan] = await tx
          .select()
          .from(installmentPlans)
          .where(eq(installmentPlans.uid, parseInt(uid)))
          .limit(1);

        if (!plan) {
          throw AppError.notFound('分期计划不存在');
        }

        if (plan.status === 'ACTIVE') {
          // 检查是否有已支付的分期
          const [paidCount] = await tx
            .select({ count: count() })
            .from(installments)
            .where(
              and(
                eq(installments.planId, plan.uid),
                eq(installments.status, 'PAID')
              )
            );

          if (paidCount.count > 0) {
            throw AppError.badRequest(
              `已有${paidCount.count}期已支付，无法删除`
            );
          }
        }

        // 2. 删除所有分期记录 (会级联删除)
        await tx
          .delete(installments)
          .where(eq(installments.planId, plan.uid));

        // 3. 删除计划
        await tx
          .delete(installmentPlans)
          .where(eq(installmentPlans.uid, plan.uid));
      });

      res.json({
        success: true,
        message: '分期计划已删除',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 刷新计划状态 (事务内部使用)
   */
  private static async refreshPlanStatus(tx, planId: number) {
    const planInstallments = await tx
      .select()
      .from(installments)
      .where(eq(installments.planId, planId));

    const allPaid = planInstallments.every(i => i.status === 'PAID');
    const allCancelled = planInstallments.every(i => i.status === 'CANCELLED');

    let newStatus = 'ACTIVE';
    if (allPaid) {
      newStatus = 'COMPLETED';
    } else if (allCancelled) {
      newStatus = 'CANCELLED';
    }

    await tx
      .update(installmentPlans)
      .set({ status: newStatus })
      .where(eq(installmentPlans.uid, planId));
  }

  /**
   * 计算到期日期
   */
  private static calculateDueDate(startDate: string, installmentNumber: number, frequency: string): string {
    const date = new Date(startDate);

    switch (frequency) {
      case 'WEEKLY':
        date.setDate(date.getDate() + 7 * installmentNumber);
        break;
      case 'MONTHLY':
        date.setMonth(date.getMonth() + installmentNumber);
        break;
      case 'QUARTERLY':
        date.setMonth(date.getMonth() + 3 * installmentNumber);
        break;
      default:
        date.setMonth(date.getMonth() + installmentNumber);
    }

    return date.toISOString().split('T')[0];
  }
}
```

---

## 3. 其他控制器适配示例

### 3.1 StudentController 适配

```typescript
// backend/src/controllers/studentController.ts

import { StudentRepository } from '../db/repositories/studentRepository';
import { StudentBuilder, StudentUpdater } from '../services/studentBuilder';
import { StudentQuery } from '../services/studentQuery';
import { StatsService } from '../services/statsService';

export class StudentController {
  /**
   * 获取所有学员 (分页)
   */
  static async getAllStudents(req, res, next) {
    try {
      const {
        name_contains,
        min_age,
        max_age,
        class_type,
        subject,
        has_membership,
        page = 1,
        limit = 10,
        sort_by = 'uid',
        sort_order = 'DESC',
      } = req.query;

      const result = new StudentQuery()
        .nameContains(name_contains)
        .ageRange(min_age, max_age)
        .classType(class_type)
        .subject(subject)
        .hasMembership(has_membership)
        .sortBy(sort_by, sort_order)
        .pagination(page, limit)
        .build();

      const { data, pagination } = await result;

      res.json({
        success: true,
        data: data.map(StudentRepository.toResponse),
        pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 添加学员
   */
  static async addStudent(req, res, next) {
    try {
      const {
        name,
        age,
        phone,
        class,
        subject,
        note,
        lesson_left,
        membership_start_date,
        membership_end_date,
      } = req.body;

      const student = await StudentBuilder.create()
        .name(name)
        .age(age)
        .phone(phone)
        .classType(class)
        .subject(subject)
        .lessonLeft(lesson_left)
        .note(note)
        .membership(membership_start_date, membership_end_date)
        .build();

      res.json({
        success: true,
        data: StudentRepository.toResponse(student),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新学员信息
   */
  static async updateStudent(req, res, next) {
    try {
      const { uid } = req.params;
      const updateData = req.body;

      const updater = await StudentUpdater.for(parseInt(uid));

      if (updateData.name !== undefined) updater.name(updateData.name);
      if (updateData.age !== undefined) updater.age(updateData.age);
      if (updateData.phone !== undefined) updater.phone(updateData.phone);
      if (updateData.class !== undefined) updater.classType(updateData.class);
      if (updateData.subject !== undefined) updater.subject(updateData.subject);
      if (updateData.lesson_left !== undefined) updater.lessonLeft(updateData.lesson_left);
      if (updateData.note !== undefined) updater.note(updateData.note);
      if (updateData.membership_start_date !== undefined || updateData.membership_end_date !== undefined) {
        updater.membership(updateData.membership_start_date, updateData.membership_end_date);
      }

      const updated = await updater.commit();

      res.json({
        success: true,
        data: StudentRepository.toResponse(updated),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量更新学员 - 使用事务
   */
  static async batchUpdateStudents(req, res, next) {
    try {
      const { updates } = req.body; // updates: Array<{ uid, ...data }>

      const results = await db.transaction(async (tx) => {
        const updatedStudents = [];

        for (const update of updates) {
          const { uid, ...data } = update;
          const updated = await tx
            .update(students)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(students.uid, uid))
            .returning();

          if (updated.length > 0) {
            updatedStudents.push(updated[0]);
          }
        }

        return updatedStudents;
      });

      res.json({
        success: true,
        data: results.map(StudentRepository.toResponse),
        count: results.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取学员统计
   */
  static async getStudentStats(req, res, next) {
    try {
      const { uid } = req.params;
      const { start, end } = req.query;

      const period = start && end ? { start, end } : undefined;
      const stats = await StatsService.buildStudentStats(parseInt(uid), period);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### 3.2 CashController 适配

```typescript
// backend/src/controllers/cashController.ts

import { CashRepository } from '../db/repositories/cashRepository';
import { CashBuilder } from '../services/cashBuilder';
import { StatsService } from '../services/statsService';

export class CashController {
  /**
   * 获取所有交易
   */
  static async getAllTransactions(req, res, next) {
    try {
      const {
        student_id,
        min_amount,
        max_amount,
        date_from,
        date_to,
        is_income,
        page = 1,
        limit = 10,
        sort_by = 'uid',
        sort_order = 'DESC',
      } = req.query;

      const transactions = await CashRepository.search({
        student_id: student_id ? parseInt(student_id) : undefined,
        min_amount: min_amount ? parseInt(min_amount) * 100 : undefined, // 转为分
        max_amount: max_amount ? parseInt(max_amount) * 100 : undefined,
        date_from,
        date_to,
        is_income: is_income !== undefined ? is_income === 'true' : undefined,
        page: parseInt(page),
        limit: parseInt(limit),
        sort_by,
        sort_order,
      });

      res.json({
        success: true,
        items: transactions.map(CashRepository.toResponse),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: transactions.length, // 简化处理
          total_pages: Math.ceil(transactions.length / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 添加普通交易
   */
  static async addCashTransaction(req, res, next) {
    try {
      const { student_id, amount, note } = req.body;

      const cash = await CashBuilder.create()
        .studentId(student_id || null)
        .amount(amount)
        .note(note)
        .build();

      res.json({
        success: true,
        data: CashRepository.toResponse(cash),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取财务统计
   */
  static async getFinancialStats(req, res, next) {
    try {
      const { start, end } = req.query;

      const period = start && end ? { start, end } : undefined;
      const stats = await StatsService.buildFinancialStats(period);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
```

---

## 4. 错误处理增强

### 4.1 事务错误处理扩展

```typescript
// backend/src/middleware/errorHandler.ts (扩展)

export async function withTransaction<T>(
  operation: (tx: Transaction) => Promise<T>,
  errorMessage: string = '操作失败'
): Promise<T> {
  return await db.transaction(async (tx) => {
    try {
      return await operation(tx);
    } catch (error) {
      // 记录事务失败
      console.error(`事务失败: ${errorMessage}`, error);

      // 如果是数据库约束错误，提供友好信息
      if (error.code === '23503') {
        // 外键约束
        throw AppError.badRequest('关联数据不存在或无法删除');
      }
      if (error.code === '23505') {
        // 唯一约束
        throw AppError.conflict('数据已存在');
      }
      if (error.code === '23514') {
        // CHECK 约束
        throw AppError.badRequest('数据验证失败');
      }

      throw error;
    }
  });
}

// 使用示例
const result = await withTransaction(
  async (tx) => {
    // 操作
  },
  '创建分期计划失败'
);
```

---

## 5. 外键约束错误映射

### 5.1 PostgreSQL 错误码

| 错误码 | 含义 | 处理方式 |
|--------|------|----------|
| `23502` | NOT NULL 约束 | 返回 400 Bad Request |
| `23503` | 外键约束 | 返回 400/404 |
| `23505` | 唯一约束 | 返回 409 Conflict |
| `23514` | CHECK 约束 | 返回 400 Bad Request |

### 5.2 错误处理中间件

```typescript
// backend/src/middleware/errorHandler.ts (更新)

app.use((error, req, res, next) => {
  console.error('Error:', error);

  // PostgreSQL 约束错误
  if (error.code) {
    switch (error.code) {
      case '23502':
        return res.status(400).json({
          success: false,
          error: '必填字段不能为空',
          detail: error.detail,
        });
      case '23503':
        return res.status(404).json({
          success: false,
          error: '关联数据不存在',
        });
      case '23505':
        return res.status(409).json({
          success: false,
          error: '数据已存在',
          detail: error.detail,
        });
      case '23514':
        return res.status(400).json({
          success: false,
          error: '数据验证失败',
          detail: error.detail,
        });
    }
  }

  // 其他错误
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: error.message || '服务器内部错误',
  });
});
```

---

## 6. API 响应兼容性

### 6.1 字段映射保持不变

所有 API 响应格式保持与 MongoDB 版本完全一致，前端无需修改。

| 后端字段 | Drizzle 字段 | 响应字段 |
|---------|-------------|----------|
| `classType` | `class_type` | `class` |
| `amount` | `amount` (分) | `cash` (元) |
| `student_id` | `studentId` | `student_id` |

由 Repository 层的 `toResponse()` 方法处理转换。

---

**下一步**: [07-DATA-MIGRATION.md](./07-DATA-MIGRATION.md) - 数据迁移脚本
