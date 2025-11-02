# QMX Backend MongoDB 迁移指南

## 概述

本指南详细说明了如何将 QMX 后端系统从 PostgreSQL/SQLite (Sequelize) 迁移到 MongoDB (Mongoose)。

## 环境变量配置

在 `.env` 文件中添加 MongoDB 连接字符串：

```bash
# MongoDB 云端连接（推荐使用 MongoDB Atlas）
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/qmx_db?retryWrites=true&w=majority

# 或者使用本地 MongoDB
MONGODB_URI=mongodb://localhost:27017/qmx_db
```

## 迁移步骤

### 1. 安装依赖

MongoDB 相关依赖已在 `package.json` 中添加：

```json
{
  "dependencies": {
    "mongoose": "^8.8.4"
  }
}
```

### 2. 运行迁移

执行数据迁移脚本：

```bash
# 迁移所有数据
npm run migrate-mongo

# 查看迁移统计
npx ts-node -e "import('./src/scripts/migrate-to-mongo').then(m => m.showMigrationStats())"
```

### 3. 数据模型对应关系

| Sequelize 模型 | MongoDB 模型 | 主要字段映射 |
|----------------|--------------|-------------|
| Student | Student | uid, name, phone, class, subject, lesson_left, rings |
| Cash | Cash | uid, student_id, cash, note |
| InstallmentPlan | InstallmentPlan | plan_id, student_id, total_amount, frequency |
| Installment | Installment | uid, plan_id, installment_number, amount |
| SystemConfig | SystemConfig | key, value, description |

## 迁移配置选项

可以通过修改 `src/scripts/migrate-to-mongo.ts` 来自定义迁移行为：

```typescript
const customConfig: MigrationConfig = {
  batchSize: 50,        // 每批处理数量
  skipExisting: true,   // 跳过已存在记录
  collections: {
    students: true,
    cash: true,
    installmentPlans: true,
    installments: true,
    systemConfigs: true,
  },
};

const migrator = new DataMigrator(customConfig);
await migrator.migrateAll();
```

## MongoDB 云端部署

### MongoDB Atlas 设置

1. 创建 MongoDB Atlas 账户
2. 创建新集群
3. 配置网络访问（允许你的服务器IP访问）
4. 创建数据库用户
5. 获取连接字符串

### 连接字符串格式

```bash
# 标准格式
mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>?retryWrites=true&w=majority

# 示例
mongodb+srv://admin:password123@qmx-cluster.abcd.mongodb.net/qmx_production?retryWrites=true&w=majority
```

## 数据库操作

### 连接管理

```typescript
import { mongoManager } from '@/config/mongodb';

// 连接到 MongoDB
await mongoManager.connect();

// 检查连接状态
console.log(mongoManager.getConnectionStatus());

// 断开连接
await mongoManager.disconnect();
```

### 基本CRUD操作

```typescript
import { MongoStudent } from '@/models/mongo';

// 创建学生
const student = new MongoStudent({
  uid: 1001,
  name: '张三',
  class: 'Python基础班',
  subject: 'Python',
  lesson_left: 10
});
await student.save();

// 查询学生
const students = await MongoStudent.find({ class: 'Python基础班' });

// 更新学生
await MongoStudent.updateOne(
  { uid: 1001 },
  { lesson_left: 8 }
);

// 删除学生
await MongoStudent.deleteOne({ uid: 1001 });
```

## 性能优化建议

### 1. 索引优化

MongoDB 模型已自动创建常用索引：

```typescript
// 学生索引
StudentSchema.index({ phone: 1 });
StudentSchema.index({ class: 1 });
StudentSchema.index({ subject: 1 });
StudentSchema.index({ membership_end_date: 1 });

// 交易记录索引
CashSchema.index({ student_id: 1 });
CashSchema.index({ created_at: 1 });
CashSchema.index({ student_id: 1, created_at: 1 });
```

### 2. 批量操作

使用批量操作提升性能：

```typescript
// 批量插入
const students = [...]; // 学生数据数组
await MongoStudent.insertMany(students);

// 批量更新
const bulkOps = students.map(student => ({
  updateOne: {
    filter: { uid: student.uid },
    update: { $set: student }
  }
}));
await MongoStudent.bulkWrite(bulkOps);
```

## 故障排除

### 常见问题

1. **连接超时**
   ```
   解决方案：检查网络连接，增加 timeout 设置
   ```

2. **认证失败**
   ```bash
   解决方案：验证用户名密码，检查IP白名单
   ```

3. **数据类型不匹配**
   ```typescript
   // 确保 BigInt 正确转换
   cash: Schema.Types.Long  // 使用 Long 类型存储大整数
   ```

### 回滚迁移

如果需要回滚迁移：

```typescript
// 清空 MongoDB 数据
import { runClearMongo } from '@/scripts/migrate-to-mongo';
await runClearMongo();
```

## 生产环境部署

### 环境变量

```bash
# 生产环境配置
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/qmx_prod?retryWrites=true&w=majority
```

### 安全设置

1. 启用 MongoDB Atlas 的网络访问控制
2. 使用强密码
3. 定期备份数据
4. 监控连接和性能指标

## 监控和维护

### 连接状态监控

```typescript
// 定期检查 MongoDB 连接状态
setInterval(async () => {
  const status = mongoManager.getConnectionStatus();
  logger.info(`MongoDB连接状态: ${status ? '已连接' : '断开'}`);
}, 30000); // 每30秒检查一次
```

### 性能监控

```typescript
// 监控查询性能
const startTime = Date.now();
const students = await MongoStudent.find({ class: 'Python基础班' });
const queryTime = Date.now() - startTime;
logger.info(`查询耗时: ${queryTime}ms`);
```

---

## 总结

通过这个完整的迁移方案，QMX 后端系统现在可以：

1. ✅ **完整支持 MongoDB 云端部署**
2. ✅ **保持与原有 Sequelize 模型的完全兼容**
3. ✅ **提供一键迁移脚本和回滚机制**
4. ✅ **优化性能索引和批量操作**
5. ✅ **完善的错误处理和日志记录**

系统现在具备了真正意义上的前后端分离架构，可以轻松部署到云端 MongoDB 数据库，满足高并发、高可用的生产环境需求。