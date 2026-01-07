# 07 - 数据迁移脚本

## 1. 迁移策略

### 1.1 迁移方式选择

| 方式 | 优点 | 缺点 | 推荐场景 |
|------|------|------|----------|
| **脚本导出导入** | 完全控制、可验证 | 需要编写代码 | 推荐 |
| **工具自动迁移** | 快捷、简单 | 不灵活、可能丢失数据 | 数据简单时 |
| **双写渐进迁移** | 零停机、风险低 | 复杂、周期长 | 大规模生产环境 |

**本项目推荐: 脚本导出导入方案**

### 1.2 迁移流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 准备阶段                                                  │
│ ├── MongoDB 数据备份                                        │
│ ├── PostgreSQL 空库准备                                     │
│ ├── 连接源数据库和目标数据库                                 │
│ └── 迁移脚本准备                                            │
├─────────────────────────────────────────────────────────────┤
│ 2. 执行阶段                                                  │
│ ├── 迁移 students 表                                        │
│ ├── 迁移 cash_transactions 表                              │
│ ├── 迁移 installment_plans 表                              │
│ ├── 迁移 installments 表                                   │
│ └── 迁移 system_configs 表                                 │
├─────────────────────────────────────────────────────────────┤
│ 3. 验证阶段                                                  │
│ ├── 记录数验证                                             │
│ ├── 关键数据抽样验证                                        │
│ ├── 外键关系验证                                           │
│ └── 业务逻辑验证                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 迁移脚本

### 2.1 主迁移脚本

```typescript
// backend/scripts/migration/migrateToPostgres.ts

import { MongoClient } from 'mongodb';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// 源数据库 (MongoDB)
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/qmx';
const mongoClient = new MongoClient(mongoUri);

// 目标数据库 (PostgreSQL)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/qmx_db',
});
const pgDb = drizzle(pgPool);

// 数据库迁移器
class DatabaseMigrator {
  private mongo: any;
  private pg: any;

  constructor(mongoClient: any, pgDb: any) {
    this.mongo = mongoClient;
    this.pg = pgDb;
  }

  /**
   * 执行完整迁移
   */
  async migrate() {
    console.log('🚀 开始数据迁移...\n');

    try {
      // 连接 MongoDB
      await this.mongo.connect();
      console.log('✅ MongoDB 连接成功');

      // 获取数据库
      const db = this.mongo.db();

      console.log('\n═══════════════════════════════════════════');
      console.log('迁移进度:');
      console.log('═══════════════════════════════════════════\n');

      // 1. 迁移 students
      await this.migrateStudents(db);

      // 2. 迁移 cash_transactions
      await this.migrateCashTransactions(db);

      // 3. 迁移 installment_plans
      await this.migrateInstallmentPlans(db);

      // 4. 迁移 installments
      await this.migrateInstallments(db);

      // 5. 迁移 system_configs
      await this.migrateSystemConfigs(db);

      console.log('\n═══════════════════════════════════════════');
      console.log('✅ 数据迁移完成！');
      console.log('═══════════════════════════════════════════\n');

    } catch (error) {
      console.error('\n❌ 迁移失败:', error);
      throw error;
    } finally {
      await this.mongo.close();
      await pgPool.end();
    }
  }

  /**
   * 迁移学员表
   */
  private async migrateStudents(db: any) {
    console.log('📋 迁移 students...');

    const collection = db.collection('students');
    const mongoStudents = await collection.find({}).toArray();

    console.log(`   源数据: ${mongoStudents.length} 条记录`);

    // 转换数据
    const pgStudents = [];

    for (const student of mongoStudents) {
      // 验证并转换日期
      const membershipStartDate = student.membership_start_date
        ? new Date(student.membership_start_date).toISOString().split('T')[0]
        : null;
      const membershipEndDate = student.membership_end_date
        ? new Date(student.membership_end_date).toISOString().split('T')[0]
        : null;

      pgStudents.push({
        uid: student.uid,
        name: student.name,
        age: student.age,
        phone: student.phone,
        classType: student.class || student.class_type,
        subject: student.subject,
        lessonLeft: student.lesson_left || 0,
        rings: Array.isArray(student.rings) ? student.rings : [],
        note: student.note || null,
        membershipStartDate,
        membershipEndDate,
        createdAt: student.created_at ? new Date(student.created_at) : new Date(),
        updatedAt: student.updated_at ? new Date(student.updated_at) : new Date(),
      });
    }

    // 批量插入 PostgreSQL
    await this.pg.insert(students).values(pgStudents);

    console.log(`   ✅ 已迁移 ${pgStudents.length} 条记录\n`);
  }

  /**
   * 迁移交易表
   */
  private async migrateCashTransactions(db: any, studentIdMap?: Map<number, number>) {
    console.log('💰 迁移 cash_transactions...');

    const collection = db.collection('cashs');
    const mongoCash = await collection.find({}).toArray();

    console.log(`   源数据: ${mongoCash.length} 条记录`);

    const pgCash = [];

    for (const cash of mongoCash) {
      // 转换 installment 快照
      const installmentSnapshot = cash.installment ? {
        plan_uid: cash.installment.plan_uid,
        installment_uid: cash.installment.installment_uid,
        installment_number: cash.installment.installment_number,
        total_installments: cash.installment.total_installments,
        due_date: cash.installment.due_date
          ? new Date(cash.installment.due_date).toISOString().split('T')[0]
          : null,
        status: cash.installment.status || null,
        note: cash.installment.note || null,
      } : null;

      pgCash.push({
        uid: cash.uid,
        studentId: cash.student_id || null,
        amount: cash.cash, // cash 字段存储的是分
        note: cash.note || null,
        installmentSnapshot,
        createdAt: cash.created_at ? new Date(cash.created_at) : new Date(),
        updatedAt: cash.updated_at ? new Date(cash.updated_at) : new Date(),
      });
    }

    await this.pg.insert(cashTransactions).values(pgCash);

    console.log(`   ✅ 已迁移 ${pgCash.length} 条记录\n`);
  }

  /**
   * 迁移分期计划表
   */
  private async migrateInstallmentPlans(db: any) {
    console.log('📅 迁移 installment_plans...');

    const collection = db.collection('installmentplans');
    const mongoPlans = await collection.find({}).toArray();

    console.log(`   源数据: ${mongoPlans.length} 条记录`);

    const pgPlans = [];

    for (const plan of mongoPlans) {
      pgPlans.push({
        uid: plan.uid,
        studentId: plan.student_id,
        totalAmount: plan.total_amount,
        downPayment: plan.down_payment || 0,
        totalInstallments: plan.total_installments,
        frequency: plan.frequency || 'MONTHLY',
        status: plan.status || 'ACTIVE',
        note: plan.note || null,
        startDate: plan.start_date
          ? new Date(plan.start_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        createdAt: plan.created_at ? new Date(plan.created_at) : new Date(),
        updatedAt: plan.updated_at ? new Date(plan.updated_at) : new Date(),
      });
    }

    await this.pg.insert(installmentPlans).values(pgPlans);

    console.log(`   ✅ 已迁移 ${pgPlans.length} 条记录\n`);
  }

  /**
   * 迁移分期记录表
   */
  private async migrateInstallments(db: any) {
    console.log('📝 迁移 installments...');

    const collection = db.collection('installments');
    const mongoInstallments = await collection.find({}).toArray();

    console.log(`   源数据: ${mongoInstallments.length} 条记录`);

    const pgInstallments = [];

    for (const installment of mongoInstallments) {
      pgInstallments.push({
        uid: installment.uid,
        planId: installment.plan_id,
        studentId: installment.student_id,
        cashUid: installment.cash_uid || null,
        installmentNumber: installment.installment_number,
        installmentAmount: installment.installment_amount,
        dueDate: new Date(installment.due_date).toISOString().split('T')[0],
        paidDate: installment.paid_date
          ? new Date(installment.paid_date).toISOString().split('T')[0]
          : null,
        status: installment.status || 'PENDING',
        note: installment.note || null,
        createdAt: installment.created_at ? new Date(installment.created_at) : new Date(),
        updatedAt: installment.updated_at ? new Date(installment.updated_at) : new Date(),
      });
    }

    await this.pg.insert(installments).values(pgInstallments);

    console.log(`   ✅ 已迁移 ${pgInstallments.length} 条记录\n`);
  }

  /**
   * 迁移系统配置表
   */
  private async migrateSystemConfigs(db: any) {
    console.log('⚙️ 迁移 system_configs...');

    const collection = db.collection('systemconfigs');
    const mongoConfig = await collection.find({}).toArray();

    console.log(`   源数据: ${mongoConfig.length} 条记录`);

    const pgConfig = [];

    for (const config of mongoConfig) {
      pgConfig.push({
        key: config.key,
        value: config.value,
        description: config.description || null,
        createdAt: config.created_at ? new Date(config.created_at) : new Date(),
        updatedAt: config.updated_at ? new Date(config.updated_at) : new Date(),
      });
    }

    await this.pg.insert(systemConfigs).values(pgConfig);

    console.log(`   ✅ 已迁移 ${pgConfig.length} 条记录\n`);
  }
}

// 导入 Schema (需要从实际文件导入)
// import { students, cashTransactions, installmentPlans, installments, systemConfigs } from '../src/db/schema';

// 执行迁移
async function main() {
  const migrator = new DatabaseMigrator(mongoClient, pgDb);
  await migrator.migrate();
}

main().catch(console.error);
```

---

## 3. 数据验证脚本

### 3.1 验证脚本

```typescript
// backend/scripts/migration/validateMigration.ts

import { MongoClient } from 'mongodb';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

class MigrationValidator {
  private mongo: any;
  private pg: any;

  constructor(mongoClient: any, pgDb: any) {
    this.mongo = mongoClient;
    this.pg = pgDb;
  }

  async validate() {
    console.log('🔍 开始数据验证...\n');

    try {
      await this.mongo.connect();
      const db = this.mongo.db();

      // 验证各类数据
      await this.validateStudents(db);
      await this.validateCashTransactions(db);
      await this.validateInstallments(db);

      console.log('\n✅ 验证完成！\n');

    } catch (error) {
      console.error('\n❌ 验证失败:', error);
      throw error;
    } finally {
      await this.mongo.close();
      // 不关闭 PostgreSQL，可能其他操作
    }
  }

  /**
   * 验证学员数据
   */
  private async validateStudents(db: any) {
    console.log('📋 验证 students...');

    // 记录数比对
    const mongoCount = await db.collection('students').countDocuments();
    const [pgCountResult] = await this.pg.select({ count: count() }).from(students);
    const pgCount = pgCountResult.count;

    console.log(`   MongoDB: ${mongoCount} 条`);
    console.log(`   PostgreSQL: ${pgCount} 条`);

    if (mongoCount !== pgCount) {
      console.error(`   ❌ 记录数不一致！差异: ${Math.abs(mongoCount - pgCount)} 条`);
    } else {
      console.log(`   ✅ 记录数一致`);
    }

    // 抽样验证关键数据
    const sampleSize = Math.min(5, mongoCount);
    const mongoSamples = await db.collection('students')
      .find({})
      .limit(sampleSize)
      .toArray();

    console.log(`   抽样验证 ${sampleSize} 条记录...`);

    for (const sample of mongoSamples) {
      const [pgSample] = await this.pg
        .select()
        .from(students)
        .where(eq(students.uid, sample.uid))
        .limit(1);

      if (!pgSample) {
        console.error(`   ❌ UID ${sample.uid} 的记录不存在于 PostgreSQL`);
        continue;
      }

      // 验证关键字段
      const issues = [];
      if (pgSample.name !== sample.name) issues.push('name');
      if (pgSample.phone !== sample.phone) issues.push('phone');
      if (pgSample.classType !== (sample.class || sample.class_type)) issues.push('class');

      if (issues.length > 0) {
        console.error(`   ❌ UID ${sample.uid} 字段不一致: ${issues.join(', ')}`);
      } else {
        console.log(`   ✅ UID ${sample.uid} 验证通过`);
      }
    }

    console.log('');
  }

  /**
   * 验证外键关系
   */
  private async validateForeignKeys(db: any) {
    console.log('🔗 验证外键关系...');

    // 检查孤儿记录 - cash_transactions.student_id
    const [orphanCash] = await this.pg
      .select({ count: count() })
      .from(cashTransactions)
      .where(
        and(
          isNotNull(cashTransactions.studentId),
          sql`NOT EXISTS (SELECT 1 FROM students WHERE uid = ${cashTransactions.studentId})`
        )
      );

    if (orphanCash.count > 0) {
      console.error(`   ❌ 发现 ${orphanCash.count} 条 cash_transactions 存在无效 student_id`);
    } else {
      console.log('   ✅ cash_transactions.student_id 外键有效');
    }

    // 检查孤儿记录 - installment_plans.student_id
    const [orphanPlans] = await this.pg
      .select({ count: count() })
      .from(installmentPlans)
      .where(
        and(
          sql`NOT EXISTS (SELECT 1 FROM students WHERE uid = ${installmentPlans.studentId})`
        )
      );

    if (orphanPlans.count > 0) {
      console.error(`   ❌ 发现 ${orphanPlans.count} 条 installment_plans 存在无效 student_id`);
    } else {
      console.log('   ✅ installment_plans.student_id 外键有效');
    }

    console.log('');
  }

  /**
   * 验证分期逻辑
   */
  private async validateInstallments(db: any) {
    console.log('📅 验证分期逻辑...');

    // 获取所有分期计划
    const plans = await this.pg.select().from(installmentPlans);

    let errorCount = 0;

    for (const plan of plans) {
      // 获取该计划的所有分期
      const planInstallments = await this.pg
        .select()
        .from(installments)
        .where(eq(installments.planId, plan.uid))
        .orderBy(asc(installments.installmentNumber));

      // 验证分期数量
      if (planInstallments.length !== plan.totalInstallments) {
        console.error(
          `   ❌ 计划 UID ${plan.uid}: 分期数不匹配 (期望 ${plan.totalInstallments}, 实际 ${planInstallments.length})`
        );
        errorCount++;
        continue;
      }

      // 验证金额总和
      const totalInstallmentAmount = planInstallments.reduce(
        (sum, i) => sum + i.installmentAmount,
        0
      );
      const expectedTotal = plan.totalAmount - plan.downPayment;

      if (totalInstallmentAmount !== expectedTotal) {
        console.error(
          `   ❌ 计划 UID ${plan.uid}: 分期金额不匹配 (期望 ${expectedTotal}, 实际 ${totalInstallmentAmount})`
        );
        errorCount++;
      }
    }

    if (errorCount === 0) {
      console.log('   ✅ 分期逻辑验证通过');
    }

    console.log('');
  }

  /**
   * 验证余额一致性
   */
  private async validateBalance(db: any) {
    console.log('💰 验证余额一致性...');

    // 计算所有现金记录总和
    const [pgSum] = await this.pg
      .select({ total: sum(cashTransactions.amount) })
      .from(cashTransactions);
    const pgTotal = Number(pgSum.total || 0);

    // MongoDB 也要计算
    const mongoResult = await db.collection('cashs').aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$cash' },
        },
      },
    ]).toArray();
    const mongoTotal = mongoResult[0]?.total || 0;

    console.log(`   MongoDB 总额: ${mongoTotal} 分`);
    console.log(`   PostgreSQL 总额: ${pgTotal} 分`);

    if (mongoTotal !== pgTotal) {
      console.error(`   ❌ 总额不一致！差异: ${Math.abs(mongoTotal - pgTotal)} 分`);
    } else {
      console.log('   ✅ 余额一致');
    }

    console.log('');
  }
}

// 执行验证
async function main() {
  const validator = new MigrationValidator(mongoClient, pgDb);
  await validator.validate();
}

main().catch(console.error);
```

---

## 4. MongoDB 备份脚本

### 4.1 备份脚本

```bash
#!/bin/bash
# backend/scripts/backup/mongodb-backup.sh

# 配置
BACKUP_DIR="./backups/mongodb"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="qmx"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "🔄 开始备份 MongoDB..."

# 使用 mongodump
mongodump \
  --uri="mongodb://localhost:27017" \
  --db="$DB_NAME" \
  --out="$BACKUP_DIR/$TIMESTAMP"

if [ $? -eq 0 ]; then
  echo "✅ 备份完成: $BACKUP_DIR/$TIMESTAMP"
else
  echo "❌ 备份失败"
  exit 1
fi

# 压缩备份
tar -czf "$BACKUP_DIR/$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "$TIMESTAMP"

if [ $? -eq 0 ]; then
  echo "✅ 压缩完成: $BACKUP_DIR/$TIMESTAMP.tar.gz"
  rm -rf "$BACKUP_DIR/$TIMESTAMP"
else
  echo "⚠️ 压缩失败，原始备份保留"
fi

# 只保留最近7天的备份
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "🧹 旧备份清理完成"
```

### 4.2 恢复脚本

```bash
#!/bin/bash
# backend/scripts/backup/mongodb-restore.sh

if [ -z "$1" ]; then
  echo "用法: $0 <备份文件路径>"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="qmx"

# 检查备份文件存在
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

echo "⚠️ 当前数据库将被覆盖!"
echo "数据库: $DB_NAME"
echo "备份: $BACKUP_FILE"
read -p "确认恢复? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ 取消恢复"
  exit 1
fi

echo "🔄 开始恢复 MongoDB..."

# 解压并恢复
tar -xzf "$BACKUP_FILE" -C /tmp
EXTRACTED_DIR=$(tar -tzf "$BACKUP_FILE" | head -1 | cut -f1 -d"/")

mongorestore \
  --uri="mongodb://localhost:27017" \
  --db="$DB_NAME" \
  --drop \
  "/tmp/$EXTRACTED_DIR"

if [ $? -eq 0 ]; then
  echo "✅ 恢复完成"
  rm -rf "/tmp/$EXTRACTED_DIR"
else
  echo "❌ 恢复失败"
  exit 1
fi
```

---

## 5. package.json 脚本

```json
{
  "scripts": {
    "db:backup": "bash ./backend/scripts/backup/mongodb-backup.sh",
    "db:restore": "bash ./backend/scripts/backup/mongodb-restore.sh",
    "migration:run": "ts-node ./backend/scripts/migration/migrateToPostgres.ts",
    "migration:validate": "ts-node ./backend/scripts/migration/validateMigration.ts",
    "migration:all": "npm run db:backup && npm run migration:run && npm run migration:validate"
  }
}
```

---

## 6. 数据一致性检查

### 6.1 重要指标

| 指标 | 验证方法 | 允许差异 |
|------|----------|----------|
| 记录总数 | COUNT(*) 对比 | 0 |
| 余额总和 | SUM(amount) 对比 | 0 |
| 外键完整性 | 检查孤立记录 | 0 |
| UID 唯一性 | 去重计数对比 | 0 |

### 6.2 验证检查清单

- [ ] students 记录数一致
- [ ] cash_transactions 记录数一致
- [ ] installment_plans 记录数一致
- [ ] installments 记录数一致
- [ ] 所有 UID 在两个数据库都存在
- [ ] 外键关系完整 (无孤儿记录)
- [ ] 分期计划与分期记录数量匹配
- [ ] 交易金额总和一致
- [ ] 日期格式正确
- [ ] 数组/JSONB 数据完整

---

**下一步**: [08-TESTING.md](./08-TESTING.md) - 测试策略
