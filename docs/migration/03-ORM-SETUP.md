# 03 - Drizzle ORM 配置

## 1. 安装依赖

```bash
cd backend

# 安装 Drizzle ORM 和 PostgreSQL 驱动
npm install drizzle-orm pg

# 安装开发依赖
npm install -D drizzle-kit @types/pg

# 可选：dotenv 用于环境变量
npm install dotenv
```

**package.json 新增依赖:**

```json
{
  "dependencies": {
    "drizzle-orm": "^0.29.0",
    "pg": "^8.11.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0",
    "@types/pg": "^8.10.0"
  }
}
```

---

## 2. 目录结构

```
backend/src/
├── db/
│   ├── index.ts              # 数据库连接和导出
│   ├── schema/
│   │   ├── students.ts       # 学员表 Schema
│   │   ├── cash.ts           # 交易表 Schema
│   │   ├── installments.ts   # 分期表 Schema
│   │   ├── configs.ts        # 系统配置表 Schema
│   │   └── index.ts          # Schema 统一导出
│   └── migrations/           # 迁移文件 (drizzle-kit 生成)
│       └── 0001_initial.sql
├── drizzle.config.ts         # Drizzle Kit 配置
└── ...
```

---

## 3. 环境变量配置

### 3.1 .env 文件

```env
# PostgreSQL 连接配置
DATABASE_URL=postgresql://username:password@localhost:5432/qmx_db

# 或分开配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qmx_db
DB_USER=qmx_user
DB_PASSWORD=your_secure_password

# 连接池配置
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

### 3.2 .env.example

```env
# PostgreSQL 连接配置
DATABASE_URL=postgresql://user:password@localhost:5432/qmx_db

# 连接池配置
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

---

## 4. 数据库连接配置

### 4.1 db/index.ts

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// 加载环境变量
import dotenv from 'dotenv';
dotenv.config();

// 连接池配置
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // 或者使用分开的配置
  // host: process.env.DB_HOST || 'localhost',
  // port: parseInt(process.env.DB_PORT || '5432'),
  // database: process.env.DB_NAME || 'qmx_db',
  // user: process.env.DB_USER,
  // password: process.env.DB_PASSWORD,

  // 连接池设置
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
};

// 创建连接池
export const pool = new Pool(poolConfig);

// 创建 Drizzle 实例
export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// 导出 Schema
export * from './schema';

// 数据库健康检查
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// 关闭连接池
export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
  console.log('Database connection pool closed');
}

// 获取连接池状态
export function getPoolStatus() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
```

### 4.2 连接池事件监听 (可选)

```typescript
// db/index.ts 追加

// 连接池事件监听
pool.on('connect', (client) => {
  console.log('New client connected to PostgreSQL');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', err);
});

pool.on('remove', (client) => {
  console.log('Client removed from pool');
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await closeDatabaseConnection();
  process.exit(0);
});
```

---

## 5. Drizzle Kit 配置

### 5.1 drizzle.config.ts

```typescript
import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default {
  // Schema 文件位置
  schema: './src/db/schema/index.ts',

  // 迁移文件输出目录
  out: './src/db/migrations',

  // 数据库驱动
  driver: 'pg',

  // 数据库连接
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },

  // 输出详细日志
  verbose: true,

  // 严格模式
  strict: true,
} satisfies Config;
```

### 5.2 package.json 脚本

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio",
    "db:drop": "drizzle-kit drop"
  }
}
```

**脚本说明:**

| 命令 | 用途 |
|------|------|
| `db:generate` | 根据 Schema 生成迁移 SQL 文件 |
| `db:migrate` | 执行迁移 |
| `db:push` | 直接推送 Schema 到数据库 (开发用) |
| `db:studio` | 启动 Drizzle Studio (数据库 GUI) |
| `db:drop` | 删除迁移文件 |

---

## 6. 应用初始化

### 6.1 修改 app.ts

```typescript
// backend/src/app.ts

import express from 'express';
import { db, checkDatabaseHealth, closeDatabaseConnection } from './db';

const app = express();

// 中间件配置...

// 健康检查端点
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();

  if (dbHealthy) {
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// 路由配置...

// 启动服务器
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // 检查数据库连接
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Database connection established');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
```

---

## 7. 事务使用示例

### 7.1 基本事务

```typescript
import { db } from '../db';
import { students, cashTransactions } from '../db/schema';

async function createStudentWithTransaction(studentData: NewStudent) {
  return await db.transaction(async (tx) => {
    // 创建学员
    const [student] = await tx
      .insert(students)
      .values(studentData)
      .returning();

    // 创建初始交易记录 (如果需要)
    if (studentData.initialPayment) {
      await tx.insert(cashTransactions).values({
        studentId: student.uid,
        amount: studentData.initialPayment,
        note: '首次缴费',
      });
    }

    return student;
  });
}
```

### 7.2 分期付款事务 (关键场景)

```typescript
import { db } from '../db';
import {
  students,
  cashTransactions,
  installmentPlans,
  installments
} from '../db/schema';
import { eq } from 'drizzle-orm';

interface CreateInstallmentPlanDTO {
  studentId: number;
  totalAmount: number;
  downPayment: number;
  totalInstallments: number;
  frequency: string;
}

async function createInstallmentPlan(data: CreateInstallmentPlanDTO) {
  return await db.transaction(async (tx) => {
    // 1. 验证学员存在
    const [student] = await tx
      .select()
      .from(students)
      .where(eq(students.uid, data.studentId))
      .limit(1);

    if (!student) {
      throw new Error('学员不存在');
    }

    // 2. 创建分期计划
    const [plan] = await tx
      .insert(installmentPlans)
      .values({
        studentId: data.studentId,
        totalAmount: data.totalAmount,
        downPayment: data.downPayment,
        totalInstallments: data.totalInstallments,
        frequency: data.frequency,
        status: 'ACTIVE',
      })
      .returning();

    // 3. 计算每期金额
    const remainingAmount = data.totalAmount - data.downPayment;
    const installmentAmount = Math.ceil(remainingAmount / data.totalInstallments);

    // 4. 创建分期记录
    const installmentRecords = [];
    for (let i = 1; i <= data.totalInstallments; i++) {
      const dueDate = calculateDueDate(plan.startDate, i, data.frequency);
      installmentRecords.push({
        planId: plan.uid,
        studentId: data.studentId,
        installmentNumber: i,
        installmentAmount: i === data.totalInstallments
          ? remainingAmount - installmentAmount * (data.totalInstallments - 1)
          : installmentAmount,
        dueDate,
        status: i === 1 ? 'PAID' : 'PENDING',
      });
    }

    const createdInstallments = await tx
      .insert(installments)
      .values(installmentRecords)
      .returning();

    // 5. 创建首付交易记录
    const [cashRecord] = await tx
      .insert(cashTransactions)
      .values({
        studentId: data.studentId,
        amount: data.downPayment + installmentAmount,
        note: `分期计划首付 + 第1期`,
        installmentSnapshot: {
          plan_uid: plan.uid,
          installment_uid: createdInstallments[0].uid,
          installment_number: 1,
          total_installments: data.totalInstallments,
          due_date: createdInstallments[0].dueDate,
          status: 'PAID',
          note: null,
        },
      })
      .returning();

    // 6. 更新首期分期的 cash_uid
    await tx
      .update(installments)
      .set({ cashUid: cashRecord.uid, paidDate: new Date().toISOString() })
      .where(eq(installments.uid, createdInstallments[0].uid));

    return {
      plan,
      installments: createdInstallments,
      cashRecord,
    };
  });
}

function calculateDueDate(startDate: string, installmentNumber: number, frequency: string): string {
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
```

### 7.3 事务回滚

```typescript
async function riskyOperation() {
  try {
    await db.transaction(async (tx) => {
      // 操作 1
      await tx.insert(students).values({ ... });

      // 操作 2 - 如果失败，操作 1 也会回滚
      await tx.insert(cashTransactions).values({ ... });

      // 手动回滚
      if (someCondition) {
        throw new Error('需要回滚');
      }
    });
  } catch (error) {
    console.error('事务回滚:', error);
    // 事务已自动回滚
  }
}
```

---

## 8. 查询示例

### 8.1 基本 CRUD

```typescript
import { db } from '../db';
import { students } from '../db/schema';
import { eq, like, and, or, desc, asc, sql } from 'drizzle-orm';

// 查询所有学员
const allStudents = await db.select().from(students);

// 条件查询
const monthStudents = await db
  .select()
  .from(students)
  .where(eq(students.classType, 'MONTH'));

// 模糊搜索
const searchResults = await db
  .select()
  .from(students)
  .where(like(students.name, '%张%'));

// 复合条件
const filtered = await db
  .select()
  .from(students)
  .where(
    and(
      eq(students.classType, 'MONTH'),
      or(
        like(students.name, '%张%'),
        like(students.phone, '138%')
      )
    )
  );

// 分页
const page = 1;
const limit = 10;
const paginated = await db
  .select()
  .from(students)
  .orderBy(desc(students.createdAt))
  .limit(limit)
  .offset((page - 1) * limit);

// 插入
const [newStudent] = await db
  .insert(students)
  .values({
    name: '张三',
    phone: '13800138000',
    classType: 'MONTH',
    subject: 'SHOOTING',
  })
  .returning();

// 更新
await db
  .update(students)
  .set({ name: '李四', updatedAt: new Date() })
  .where(eq(students.uid, 1));

// 删除
await db
  .delete(students)
  .where(eq(students.uid, 1));
```

### 8.2 关联查询

```typescript
import { db } from '../db';
import { students, cashTransactions, installmentPlans } from '../db/schema';
import { eq } from 'drizzle-orm';

// 使用 JOIN 查询学员及其交易
const studentWithTransactions = await db
  .select({
    student: students,
    transaction: cashTransactions,
  })
  .from(students)
  .leftJoin(cashTransactions, eq(students.uid, cashTransactions.studentId))
  .where(eq(students.uid, 1));

// 使用关系查询 (需要配置 relations)
const studentWithRelations = await db.query.students.findFirst({
  where: eq(students.uid, 1),
  with: {
    transactions: true,
    installmentPlans: {
      with: {
        installments: true,
      },
    },
  },
});
```

### 8.3 聚合查询

```typescript
import { db } from '../db';
import { cashTransactions } from '../db/schema';
import { sql, sum, count, avg } from 'drizzle-orm';

// 财务统计
const financialStats = await db
  .select({
    totalIncome: sum(sql`CASE WHEN ${cashTransactions.amount} > 0 THEN ${cashTransactions.amount} ELSE 0 END`),
    totalExpense: sum(sql`CASE WHEN ${cashTransactions.amount} < 0 THEN ${cashTransactions.amount} ELSE 0 END`),
    transactionCount: count(),
  })
  .from(cashTransactions);

// 按学员分组统计
const studentStats = await db
  .select({
    studentId: cashTransactions.studentId,
    totalAmount: sum(cashTransactions.amount),
    transactionCount: count(),
  })
  .from(cashTransactions)
  .groupBy(cashTransactions.studentId)
  .orderBy(desc(sum(cashTransactions.amount)))
  .limit(10);
```

---

## 9. 迁移工作流

### 9.1 开发流程

```bash
# 1. 修改 Schema 文件
# 编辑 src/db/schema/*.ts

# 2. 生成迁移文件
npm run db:generate

# 3. 检查生成的 SQL
cat src/db/migrations/xxxx_*.sql

# 4. 执行迁移
npm run db:migrate

# 5. (可选) 使用 Studio 查看数据
npm run db:studio
```

### 9.2 生产部署

```bash
# 1. 确保环境变量正确
export DATABASE_URL=postgresql://...

# 2. 执行迁移
npm run db:migrate

# 3. 启动应用
npm start
```

---

**下一步**: [04-MODEL-LAYER.md](./04-MODEL-LAYER.md) - 数据模型层重写
