# 05 - 服务层迁移

## 1. 迁移Overview

### 1.1 现有服务层结构

```
backend/src/services/
├── statsService.ts          # 统计服务 (MongoDB聚合)
├── studentQuery.ts          # 学员查询构造器
├── studentBuilder.ts        # 学员创建器
├── studentUpdater.ts        # 学员更新器
├── cashBuilder.ts           # 交易创建器
├── cashUpdater.ts           # 交易更新器
└── studentPresenter.ts      # 数据展示器 (无需修改)
```

### 1.2 迁移策略

| 服务 | 变更类型 | 复杂度 |
|------|----------|--------|
| **statsService.ts** | 完全重写 | 高 |
| **studentQuery.ts** | 重写查询逻辑 | 高 |
| **studentBuilder.ts** | 适配新Repository | 中 |
| **studentUpdater.ts** | 适配新Repository | 中 |
| **cashBuilder.ts** | 适配新Repository | 中 |
| **cashUpdater.ts** | 适配新Repository | 中 |
| **studentPresenter.ts** | 无需修改 | 低 |

---

## 2. StatsService 重写

### 2.1 原 MongoDB 聚合查询

```typescript
// 原代码: backend/src/services/statsService.ts

// 财务统计 - MongoDB 聚合管道
const revenueExpensePipeline: PipelineStage[] = [
  {
    $group: {
      _id: null,
      revenue: { $sum: { $cond: [{ $gt: ['$cash', 0] }, '$cash', 0] } },
      expense: { $sum: { $cond: [{ $lt: ['$cash', 0] }, '$cash', 0] } },
    },
  },
];
```

### 2.2 新 PostgreSQL 查询

```typescript
// backend/src/services/statsService.ts

import { db } from '../db';
import {
  students,
  cashTransactions,
  installmentPlans,
  installments
} from '../db/schema';
import {
  sum,
  count,
  avg,
  and,
  gte,
  lte,
  eq,
  sql,
  desc,
  asc
} from 'drizzle-orm';

export interface DashboardStats {
  totalStudents: number;
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  averageScore: number;
  activeMembers: number;
  expiringSoonMembers: number;
  overdueInstallments: number;
}

export interface StatsPeriod {
  start: string;
  end: string;
}

export class StatsService {
  /**
   * 构建仪表盘统计数据
   */
  static async buildDashboardStats(period?: StatsPeriod): Promise<DashboardStats> {
    const conditions = this.buildDateConditions(period);

    // 并行查询多个指标
    const [
      studentCount,
      incomeStats,
      avgScoreResult,
      activeMembersResult,
      expiringSoonResult,
      overdueResult
    ] = await Promise.all([
      // 总学员数
      db.select({ count: count() }).from(students),

      // 收入支出统计
      db.select({
        totalIncome: sum(sql`CASE WHEN ${cashTransactions.amount} > 0 THEN ${cashTransactions.amount} ELSE 0 END`),
        totalExpense: sum(sql`CASE WHEN ${cashTransactions.amount} < 0 THEN ABS(${cashTransactions.amount}) ELSE 0 END`),
      }).from(cashTransactions).where(
        and(
          conditions.dateFrom ? gte(cashTransactions.createdAt, conditions.dateFrom) : undefined,
          conditions.dateTo ? lte(cashTransactions.createdAt, conditions.dateTo) : undefined
        )
      ),

      // 平均成绩
      db.select({
        avgScore: avg(sql`AVG(${students.rings[1]})`)
      }).from(students).where(sql`array_length(${students.rings}, 1) > 0`),

      // 活跃会员
      db.select({ count: count() }).from(students).where(
        and(
          sql`${students.membershipEndDate} IS NOT NULL`,
          sql`${students.membershipEndDate} > CURRENT_DATE`
        )
      ),

      // 即将到期会员 (7天内)
      db.select({ count: count() }).from(students).where(
        and(
          sql`${students.membershipEndDate} > CURRENT_DATE`,
          sql`${students.membershipEndDate} <= CURRENT_DATE + INTERVAL '7 days'`
        )
      ),

      // 逾期分期数
      db.select({ count: count() }).from(installments).where(
        and(
          eq(installments.status, 'PENDING'),
          sql`${installments.dueDate} < CURRENT_DATE`
        )
      )
    ]);

    const totalIncome = Number(incomeStats[0]?.totalIncome || 0);
    const totalExpense = Number(incomeStats[0]?.totalExpense || 0);

    return {
      totalStudents: studentCount[0]?.count || 0,
      totalRevenue: totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      averageScore: Number(avgScoreResult[0]?.avgScore || 0).toFixed(1),
      activeMembers: activeMembersResult[0]?.count || 0,
      expiringSoonMembers: expiringSoonResult[0]?.count || 0,
      overdueInstallments: overdueResult[0]?.count || 0,
    };
  }

  /**
   * 构建学员统计数据
   */
  static async buildStudentStats(studentId: number, period?: StatsPeriod) {
    const conditions = this.buildDateConditions(period);

    // 学员信息
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.uid, studentId))
      .limit(1);

    if (!student) {
      throw new Error('学员不存在');
    }

    // 该学员的交易统计
    const [transactionStats] = await db
      .select({
        totalPayments: sum(sql`CASE WHEN ${cashTransactions.amount} > 0 THEN ${cashTransactions.amount} ELSE 0 END`),
        totalExpenses: sum(sql`CASE WHEN ${cashTransactions.amount} < 0 THEN ABS(${cashTransactions.amount}) ELSE 0 END`),
        paymentCount: count(),
      })
      .from(cashTransactions)
      .where(
        and(
          eq(cashTransactions.studentId, studentId),
          conditions.dateFrom ? gte(cashTransactions.createdAt, conditions.dateFrom) : undefined,
          conditions.dateTo ? lte(cashTransactions.createdAt, conditions.dateTo) : undefined
        )
      );

    // 成绩统计
    const rings = student.rings || [];
    const averageScore = rings.length > 0 ? (rings.reduce((a, b) => a + b, 0) / rings.length).toFixed(1) : 0;
    const maxScore = rings.length > 0 ? Math.max(...rings) : 0;

    // 会员状态
    const today = new Date().toISOString().split('T')[0];
    let membershipStatus = 'NONE';
    if (student.membershipEndDate) {
      if (student.membershipEndDate < today) {
        membershipStatus = 'EXPIRED';
      } else if (student.membershipEndDate > today) {
        membershipStatus = 'ACTIVE';
      }
    }

    return {
      student: {
        uid: student.uid,
        name: student.name,
        age: student.age,
        phone: student.phone,
        classType: student.classType,
        subject: student.subject,
      },
      stats: {
        totalPayments: Number(transactionStats[0]?.totalPayments || 0),
        totalExpenses: Number(transactionStats[0]?.totalExpenses || 0),
        paymentCount: transactionStats[0]?.paymentCount || 0,
        averageScore,
        maxScore,
        scoreCount: rings.length,
      },
      membership: {
        status: membershipStatus,
        startDate: student.membershipStartDate,
        endDate: student.membershipEndDate,
      },
    };
  }

  /**
   * 构建财务统计数据
   */
  static async buildFinancialStats(period?: StatsPeriod) {
    const conditions = this.buildDateConditions(period);

    // 收入支出
    const [incomeExpense] = await db
      .select({
        totalIncome: sum(sql`CASE WHEN ${cashTransactions.amount} > 0 THEN ${cashTransactions.amount} ELSE 0 END`),
        totalExpense: sum(sql`CASE WHEN ${cashTransactions.amount} < 0 THEN ABS(${cashTransactions.amount}) ELSE 0 END`),
        transactionCount: count(),
      })
      .from(cashTransactions)
      .where(
        and(
          conditions.dateFrom ? gte(cashTransactions.createdAt, conditions.dateFrom) : undefined,
          conditions.dateTo ? lte(cashTransactions.createdAt, conditions.dateTo) : undefined
        )
      );

    const totalIncome = Number(incomeExpense[0]?.totalIncome || 0);
    const totalExpense = Number(incomeExpense[0]?.totalExpense || 0);

    // 分期统计
    const [installmentStats] = await db
      .select({
        totalPlans: count(),
        activePlans: sum(sql`CASE WHEN ${installmentPlans.status} = 'ACTIVE' THEN 1 ELSE 0 END`),
        completedPlans: sum(sql`CASE WHEN ${installmentPlans.status} = 'COMPLETED' THEN 1 ELSE 0 END`),
        cancelledPlans: sum(sql`CASE WHEN ${installmentPlans.status} = 'CANCELLED' THEN 1 ELSE 0 END`),
      })
      .from(installmentPlans)
      .where(
        and(
          conditions.dateFrom ? gte(installmentPlans.createdAt, conditions.dateFrom) : undefined,
          conditions.dateTo ? lte(installmentPlans.createdAt, conditions.dateTo) : undefined
        )
      );

    // 学员收入排名
    const topStudents = await db
      .select({
        studentId: cashTransactions.studentId,
        studentName: students.name,
        totalAmount: sum(cashTransactions.amount),
      })
      .from(cashTransactions)
      .leftJoin(students, eq(students.uid, cashTransactions.studentId))
      .where(
        and(
          gt(cashTransactions.amount, 0),
          conditions.dateFrom ? gte(cashTransactions.createdAt, conditions.dateFrom) : undefined,
          conditions.dateTo ? lte(cashTransactions.createdAt, conditions.dateTo) : undefined
        )
      )
      .groupBy(cashTransactions.studentId, students.name)
      .orderBy(desc(sum(cashTransactions.amount)))
      .limit(10);

    return {
      summary: {
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        transactionCount: incomeExpense[0]?.transactionCount || 0,
      },
      installments: {
        totalPlans: installmentStats[0]?.totalPlans || 0,
        activePlans: Number(installmentStats[0]?.activePlans || 0),
        completedPlans: Number(installmentStats[0]?.completedPlans || 0),
        cancelledPlans: Number(installmentStats[0]?.cancelledPlans || 0),
      },
      topStudents: topStudents.map(s => ({
        studentId: s.studentId,
        studentName: s.studentName || '未知',
        totalAmount: Number(s.totalAmount),
      })),
    };
  }

  /**
   * 构建日期查询条件
   */
  private static buildDateConditions(period?: StatsPeriod) {
    if (!period) return {};

    return {
      dateFrom: period.start ? new Date(period.start) : undefined,
      dateTo: period.end ? new Date(period.end) : undefined,
    };
  }
}
```

---

## 3. StudentQuery 重写

### 3.1 原 MongoDB 聚合管道

```typescript
// 原代码: backend/src/services/studentQuery.ts

class StudentQuery {
  private nameFilter?: string;
  private ageFilter = { min: undefined, max: undefined };
  // ...

  buildPipeline(): any[] {
    const stages = [];

    // $match 阶段
    stages.push({ $match: this.buildConditions() });

    // $addFields 阶段 - 计算平均分
    stages.push({
      $addFields: {
        averageScore: {
          $cond: [
            { $gt: [{ $size: '$rings' }, 0] },
            { $divide: [{ $reduce: { input: '$rings', initialValue: 0, in: { $add: ['$$value', '$$this'] } } }, { $size: '$rings' }] },
            0,
          ],
        },
      },
    });

    // $sort, $skip, $limit

    return stages;
  }
}
```

### 3.2 新 PostgreSQL 查询构造器

```typescript
// backend/src/services/studentQuery.ts

import { db } from '../db';
import { students } from '../db/schema';
import {
  eq,
  and,
  gte,
  lte,
  like,
  isNull,
  isNotNull,
  desc,
  asc,
  count
} from 'drizzle-orm';

interface StudentQueryOptions {
  name?: string;
  minAge?: number;
  maxAge?: number;
  classType?: string;
  subject?: string;
  hasMembership?: boolean;
  membershipStatus?: 'ACTIVE' | 'EXPIRED' | 'UPCOMING';
  minScore?: number;
  maxScore?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

interface StudentQueryResult {
  data: StudentQueryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StudentQueryItem {
  uid: number;
  name: string;
  age: number | null;
  phone: string;
  classType: string;
  subject: string;
  rings: number[];
  averageScore: number;
  membershipStatus: 'NONE' | 'ACTIVE' | 'EXPIRED' | 'UPCOMING';
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  createdAt: string;
}

export class StudentQuery {
  private name?: string;
  private minAge?: number;
  private maxAge?: number;
  private classType?: string;
  private subject?: string;
  private hasMembership?: boolean;
  private membershipStatus?: 'ACTIVE' | 'EXPIRED' | 'UPCOMING';
  private minScore?: number;
  private maxScore?: number;
  private sortBy = 'uid';
  private sortOrder: 'ASC' | 'DESC' = 'DESC';
  private page = 1;
  private limit = 10;

  // 流畅 API
  nameContains(name?: string | null) {
    this.name = name || undefined;
    return this;
  }

  ageRange(min?: number | null, max?: number | null) {
    this.minAge = min || undefined;
    this.maxAge = max || undefined;
    return this;
  }

  classType(classType?: string | null) {
    this.classType = classType || undefined;
    return this;
  }

  subject(subject?: string | null) {
    this.subject = subject || undefined;
    return this;
  }

  hasMembership(has?: boolean | null) {
    this.hasMembership = has || undefined;
    return this;
  }

  membershipStatus(status?: 'ACTIVE' | 'EXPIRED' | 'UPCOMING' | null) {
    this.membershipStatus = status || undefined;
    return this;
  }

  scoreRange(min?: number | null, max?: number | null) {
    this.minScore = min || undefined;
    this.maxScore = max || undefined;
    return this;
  }

  sortBy(field: string, order: 'ASC' | 'DESC' = 'DESC') {
    this.sortBy = field;
    this.sortOrder = order;
    return this;
  }

  pagination(page: number = 1, limit: number = 10) {
    this.page = page;
    this.limit = limit;
    return this;
  }

  /**
   * 构建查询条件
   */
  private buildConditions() {
    const conditions = [];

    if (this.name) {
      conditions.push(like(students.name, `%${this.name}%`));
    }

    if (this.minAge !== undefined) {
      conditions.push(gte(students.age, this.minAge));
    }

    if (this.maxAge !== undefined) {
      conditions.push(lte(students.age, this.maxAge));
    }

    if (this.classType) {
      conditions.push(eq(students.classType, this.classType));
    }

    if (this.subject) {
      conditions.push(eq(students.subject, this.subject));
    }

    if (this.hasMembership === true) {
      conditions.push(isNotNull(students.membershipEndDate));
    } else if (this.hasMembership === false) {
      conditions.push(isNull(students.membershipEndDate));
    }

    if (this.membershipStatus) {
      const today = new Date().toISOString().split('T')[0];
      if (this.membershipStatus === 'ACTIVE') {
        conditions.push(sql`${students.membershipEndDate} > CURRENT_DATE`);
      } else if (this.membershipStatus === 'EXPIRED') {
        conditions.push(sql`${students.membershipEndDate} < CURRENT_DATE`);
      } else if (this.membershipStatus === 'UPCOMING') {
        conditions.push(
          and(
            sql`${students.membershipStartDate} > CURRENT_DATE`,
            sql`${students.membershipEndDate} IS NOT NULL`
          )
        );
      }
    }

    return conditions;
  }

  /**
   * 计算平均分作为子查询
   */
  private calculateAverageScore() {
    return sql`
      CASE WHEN array_length(${students.rings}, 1) > 0
        THEN round((SELECT AVG(r) FROM unnest(${students.rings}) AS r), 1)
        ELSE 0
      END
    `.as('averageScore');
  }

  /**
   * 计算会员状态
   */
  private calculateMembershipStatus() {
    return sql`
      CASE
        WHEN ${students.membershipEndDate} IS NULL THEN 'NONE'
        WHEN ${students.membershipEndDate} < CURRENT_DATE THEN 'EXPIRED'
        WHEN ${students.membershipStartDate} > CURRENT_DATE THEN 'UPCOMING'
        ELSE 'ACTIVE'
      END
    `.as('membershipStatus');
  }

  /**
   * 执行查询
   */
  async execute(): Promise<StudentQueryResult> {
    const conditions = this.buildConditions();
    const offset = (this.page - 1) * this.limit;

    // 查询数据
    const query = db
      .select({
        uid: students.uid,
        name: students.name,
        age: students.age,
        phone: students.phone,
        classType: students.classType,
        subject: students.subject,
        rings: students.rings,
        averageScore: this.calculateAverageScore(),
        membershipStatus: this.calculateMembershipStatus(),
        membershipStartDate: students.membershipStartDate,
        membershipEndDate: students.membershipEndDate,
        createdAt: students.createdAt,
      })
      .from(students);

    // 添加条件
    let finalQuery = conditions.length > 0
      ? query.where(and(...conditions))
      : query;

    // 添加平均分过滤
    if (this.minScore !== undefined || this.maxScore !== undefined) {
      const avgScore = this.calculateAverageScore();
      finalQuery = finalQuery.having(
        and(
          this.minScore !== undefined ? sql`${avgScore} >= ${this.minScore}` : undefined,
          this.maxScore !== undefined ? sql`${avgScore} <= ${this.maxScore}` : undefined
        )
      );
    }

    // 排序
    const orderByColumn = this.sortBy === 'name' ? students.name
      : this.sortBy === 'age' ? students.age
      : this.sortBy === 'averageScore' ? this.calculateAverageScore()
      : this.sortBy === 'created_at' ? students.createdAt
      : students.uid;

    const sort = this.sortOrder === 'ASC' ? asc(orderByColumn) : desc(orderByColumn);
    finalQuery = finalQuery.orderBy(sort);

    // 分页
    const data = await finalQuery.limit(this.limit).offset(offset);

    // 查询总数
    let countQuery = db.select({ count: count() }).from(students);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [countResult] = await countQuery;
    const total = countResult?.count || 0;

    return {
      data: data as StudentQueryItem[],
      pagination: {
        page: this.page,
        limit: this.limit,
        total,
        totalPages: Math.ceil(total / this.limit),
      },
    };
  }

  /**
   * 快捷执行 (不处理结果)
   */
  async build() {
    return await this.execute();
  }
}
```

---

## 4. Builder/Updater 模式适配

### 4.1 StudentBuilder 适配

```typescript
// backend/src/services/studentBuilder.ts

import { StudentRepository } from '../db/repositories/studentRepository';
import { NewStudent } from '../db/schema/students';

export class StudentBuilder {
  private payload: Partial<NewStudent> = {};

  static create() {
    return new StudentBuilder();
  }

  // 构建方法
  name(name: string): this {
    this.payload.name = name;
    return this;
  }

  age(age: number | null): this {
    this.payload.age = age === null ? null : age;
    return this;
  }

  phone(phone: string): this {
    this.payload.phone = phone;
    return this;
  }

  classType(classType: string): this {
    this.payload.classType = classType;
    return this;
  }

  subject(subject: string): this {
    this.payload.subject = subject;
    return this;
  }

  rings(rings: number[]): this {
    this.payload.rings = rings;
    return this;
  }

  lessonLeft(lessons: number): this {
    this.payload.lessonLeft = lessons;
    return this;
  }

  note(note?: string | null): this {
    this.payload.note = note || null;
    return this;
  }

  membership(startDate?: string | null, endDate?: string | null): this {
    this.payload.membershipStartDate = startDate || null;
    this.payload.membershipEndDate = endDate || null;
    return this;
  }

  async build(): Promise<NewStudent> {
    // 验证
    this.validate();

    // 构建学员
    return await StudentRepository.create(this.payload as NewStudent);
  }

  private validate() {
    if (!this.payload.name) {
      throw new Error('学员姓名不能为空');
    }
    if (!this.payload.phone) {
      throw new Error('手机号不能为空');
    }
  }
}
```

### 4.2 StudentUpdater 适配

```typescript
// backend/src/services/studentUpdater.ts

import { StudentRepository, Student } from '../db/repositories/studentRepository';
import { NewStudent } from '../db/schema/students';

export class StudentUpdater {
  private student: Student;
  private updates: Partial<NewStudent> = {};
  private ringsDirty = false;

  static async for(uid: number): Promise<StudentUpdater> {
    const student = await StudentRepository.findByUid(uid);
    if (!student) {
      throw new Error('学员不存在');
    }
    return new StudentUpdater(student);
  }

  static fromDocument(student: Student): StudentUpdater {
    return new StudentUpdater(student);
  }

  constructor(student: Student) {
    this.student = student;
  }

  name(name: string): this {
    this.updates.name = name;
    return this;
  }

  age(age: number | null): this {
    this.updates.age = age;
    return this;
  }

  phone(phone: string): this {
    this.updates.phone = phone;
    return this;
  }

  classType(classType: string): this {
    this.updates.classType = classType;
    return this;
  }

  subject(subject: string): this {
    this.updates.subject = subject;
    return this;
  }

  rings(rings: number[]): this {
    this.updates.rings = rings;
    this.ringsDirty = true;
    return this;
  }

  addRing(score: number): this {
    const newRings = [...(this.student.rings || []), score];
    this.updates.rings = newRings;
    this.ringsDirty = true;
    return this;
  }

  removeRing(index: number): this {
    const rings = this.student.rings || [];
    if (index >= rings.length) {
      throw new Error('成绩索引超出范围');
    }
    const newRings = rings.filter((_, i) => i !== index);
    this.updates.rings = newRings;
    this.ringsDirty = true;
    return this;
  }

  ringAt(index: number, score: number): this {
    const rings = this.student.rings || [];
    if (index >= rings.length) {
      throw new Error('成绩索引超出范围');
    }
    const newRings = [...rings];
    newRings[index] = score;
    this.updates.rings = newRings;
    this.ringsDirty = true;
    return this;
  }

  lessonLeft(lessons: number): this {
    this.updates.lessonLeft = lessons;
    return this;
  }

  note(note?: string | null): this {
    this.updates.note = note || null;
    return this;
  }

  membership(startDate?: string | null, endDate?: string | null): this {
    this.updates.membershipStartDate = startDate || null;
    this.updates.membershipEndDate = endDate || null;
    return this;
  }

  async commit(): Promise<Student> {
    if (Object.keys(this.updates).length === 0) {
      return this.student;
    }

    const updated = await StudentRepository.updateByUid(this.student.uid, this.updates);
    if (!updated) {
      throw new Error('更新失败');
    }

    this.student = updated;
    return updated;
  }
}
```

### 4.3 CashBuilder 适配

```typescript
// backend/src/services/cashBuilder.ts

import { CashRepository, NewCashTransaction } from '../db/repositories/cashRepository';
import { StudentRepository } from '../db/repositories/studentRepository';

export class CashBuilder {
  private payload: Partial<NewCashTransaction> = {};
  private checkStudent = true;

  static create() {
    return new CashBuilder();
  }

  studentId(id: number | null): this {
    this.payload.studentId = id;
    return this;
  }

  amount(amount: number): this {
    // 转换为分
    this.payload.amount = Math.round(amount * 100);
    return this;
  }

  amountInCents(cents: number): this {
    this.payload.amount = cents;
    return this;
  }

  note(note?: string | null): this {
    this.payload.note = note || null;
    return this;
  }

  installment(snapshot: any): this {
    this.payload.installmentSnapshot = snapshot;
    return this;
  }

  validateStudent(validate: boolean = true): this {
    this.checkStudent = validate;
    return this;
  }

  async build(): Promise<NewCashTransaction> {
    // 验证学员存在
    if (this.checkStudent && this.payload.studentId !== null && this.payload.studentId !== undefined) {
      const student = await StudentRepository.findByUid(this.payload.studentId);
      if (!student) {
        throw new Error('学员不存在');
      }
    }

    // 验证金额
    if (!this.payload.amount) {
      throw new Error('金额不能为空');
    }

    return await CashRepository.create(this.payload as NewCashTransaction);
  }
}
```

---

## 5. MongoDB 聚合操作映射表

### 5.1 聚合阶段映射

| MongoDB | PostgreSQL | 说明 |
|---------|-----------|------|
| `$match` | `WHERE` | 过滤条件 |
| `$group` | `GROUP BY` | 分组 |
| `$sum` | `SUM()` | 求和 |
| `$avg` | `AVG()` | 平均值 |
| `$count` | `COUNT()` | 计数 |
| `$sort` | `ORDER BY` | 排序 |
| `$skip` | `OFFSET` | 跳过 |
| `$limit` | `LIMIT` | 限制 |
| `$addFields` | `SELECT ... AS` | 添加计算字段 |
| `$cond` | `CASE WHEN ... THEN ...` | 条件表达式 |
| `$regex` | `~*` 或 `ILIKE` | 正则/模糊匹配 |

### 5.2 复杂查询示例

#### MongoDB 聚合

```typescript
// MongoDB
const pipeline = [
  {
    $match: {
      $and: [
        { created_at: { $gte: startDate, $lt: endDate } },
        { cash: { $gt: 0 } },
        { student_id: { $ne: null } },
      ],
    },
  },
  {
    $group: {
      _id: '$student_id',
      totalAmount: { $sum: '$cash' },
      transactionCount: { $sum: 1 },
    },
  },
  { $sort: { totalAmount: -1 } },
  { $limit: 10 },
];
```

#### PostgreSQL SQL

```typescript
// PostgreSQL
const result = await db
  .select({
    studentId: cashTransactions.studentId,
    totalAmount: sum(cashTransactions.amount),
    transactionCount: count(),
  })
  .from(cashTransactions)
  .where(
    and(
      gte(cashTransactions.createdAt, startDate),
      lte(cashTransactions.createdAt, endDate),
      gt(cashTransactions.amount, 0),
      isNotNull(cashTransactions.studentId)
    )
  )
  .groupBy(cashTransactions.studentId)
  .orderBy(desc(sum(cashTransactions.amount)))
  .limit(10);
```

---

**下一步**: [06-CONTROLLER-LAYER.md](./06-CONTROLLER-LAYER.md) - 控制器层改造
