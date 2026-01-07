# 09 - 回滚方案

## 1. 回滚策略总览

### 1.1 回滚触发条件

| 严重程度 | 触发条件 | 立即回滚? |
|---------|---------|----------|
| **P0 - 严重** | 数据丢失、财务数据不一致、核心功能不可用 | ✅ |
| **P1 - 高** | 性能下降50%以上、频繁错误、用户体验严重受影响 | ✅ |
| **P2 - 中** | 功能不完整、边缘情况失败、性能轻微下降 | ⚠️ 评估后决定 |
| **P3 - 低** | 显示问题、非关键功能异常 | ❌ 修复后处理 |

### 1.2 回滚决策流程

```
发现问题 → 评估影响 → 决策回滚 → 执行回滚 → 验证恢复 → 分析原因
   ↓          ↓          ↓          ↓          ↓          ↓
  监控告警   影响评估   决定回滚   执行回滚   验证数据   根本分析
```

---

## 2. 预备工作

### 2.1 回滚前提条件

在允许迁移之前，必须满足：

- [ ] MongoDB 完整备份已完成并可恢复
- [ ] 备份文件已上传到安全位置
- [ ] 回滚脚本已测试通过
- [ ] 团队所有成员熟悉回滚流程
- [ ] 回滚方案已获批准
- [ ] 通知相关人员（用户、运维、管理）

### 2.2 备份清单

```bash
# MongoDB 备份
mongodump --uri="mongodb://localhost:27017/qmx" --out="./backups/mongodb/timestamp"
tar -czf "./backups/mongodb/qmx_pre_migration_$(date +%Y%m%d_%H%M%S).tar.gz" -C "./backups/mongodb/timestamp" .

# PostgreSQL 备份 (可选，用于比较)
pg_dump -U username -d qmx_db > ./backups/postgres/qmx_post_migration_$(date +%Y%m%d_%H%M%S).sql

# 代码备份
git tag -a pre-migration -m "Pre-migration backup"
git push origin pre-migration

# 配置文件备份
cp .env .env.backup
cp package.json package.json.backup
```

---

## 3. 回滚方案 A: 快速回滚 (代码级)

### 3.1 适用场景

- 数据完整性验证已通过
- PostgreSQL 数据正常
- 代码存在 bug 或性能问题

### 3.2 回滚步骤

```bash
# 1. 切换回 MongoDB 分支
git checkout release-pre-mongodb

# 或者使用 tag
git checkout pre-migration

# 2. 安装依赖
npm install

# 3. 恢复 .env 配置
cp .env.backup .env

# 4. 重启服务
npm run backend

# 5. 验证服务健康
curl http://localhost:3001/health

# 6. 验证数据访问
curl http://localhost:3001/api/v1/students
```

### 3.3 回滚脚本

```bash
#!/bin/bash
# rollback/quick-rollback.sh

set -e

echo "🔄 开始快速回滚 (代码级)..."

# 检查是否已有备份
if ! git rev-parse pre-migration >/dev/null 2>&1; then
  echo "❌ 未找到 pre-migration 标签"
  echo "请先创建备份标签: git tag -a pre-migration -m 'Pre-migration backup'"
  exit 1
fi

# 停止服务
echo "🛑 停止服务..."
pm2 stop qmx-backend || echo "PM2 未运行"

# 切换分支
echo "♻️ 切换到 pre-migration 版本..."
git checkout pre-migration

# 恢复依赖
echo "📦 恢复依赖..."
npm install

# 重启服务
echo "🚀 重启服务..."
pm2 start npm --name qmx-backend -- run backend

# 等待服务启动
sleep 5

# 健康检查
echo "🔍 健康检查..."
if curl -f http://localhost:3001/health; then
  echo "✅ 服务健康正常"
else
  echo "❌ 服务健康检查失败"
  exit 1
fi

echo "✅ 快速回滚完成！"
```

---

## 4. 回滚方案 B: 数据级回滚 (完整)

### 4.1 适用场景

- PostgreSQL 数据损坏
- 数据不一致
- 迁移后发现问题

### 4.2 回滚步骤

#### 步骤1: 停止所有服务

```bash
# 停止应用
pm2 stop qmx-backend
pm2 stop qmx-frontend

# 停止 PostgreSQL (可选，如果不再使用)
sudo systemctl stop postgresql

# 确认进程已停止
ps aux | grep node
ps aux | grep postgres
```

#### 步骤2: 恢复 MongoDB 数据

```bash
# 找到最新的备份文件
ls -ltrh ./backups/mongodb/*.tar.gz | tail -1

# 解压备份
BACKUP_FILE="./backups/mongodb/qmx_pre_migration_20250107_120000.tar.gz"
EXTRACT_DIR="/tmp/mongodb_restore"

rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"
tar -xzf "$BACKUP_FILE" -C /tmp

# 恢复数据
mongorestore \
  --uri="mongodb://localhost:27017" \
  --db=qmx \
  --drop \
  "$EXTRACT_DIR/qmx"

echo "✅ MongoDB 数据恢复完成"

# 验证恢复
mongo --eval "use qmx; db.students.countDocuments()"
mongo --eval "use qmx; db.cashs.countDocuments()"
```

#### 步骤3: 恢复代码

```bash
# 同方案 A
git checkout pre-migration
npm install
```

#### 步骤4: 启动服务

```bash
# 启动 MongoDB (如果已停止)
sudo systemctl start mongod

# 等待 MongoDB 就绪
sleep 5

# 启动应用
pm2 start npm --name qmx-backend -- run backend
pm2 start npm --name qmx-frontend -- run dev

# 健康检查
sleep 3
curl http://localhost:3001/health
```

### 4.3 完整回滚脚本

```bash
#!/bin/bash
# rollback/full-rollback.sh

set -e

BACKUP_DIR="./backups/mongodb"
CURRENT_DATE=$(date +%Y%m%d_%H%M%S)

echo "══════════════════════════════════════════"
echo "🔄 完整回滚 (MongoDB + 代码)"
echo "══════════════════════════════════════════"
echo ""

# 1. 确认回滚
echo "⚠️ 此操作将完全回滚到 MongoDB 版本"
read -p "确认继续? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ 取消回滚"
  exit 0
fi

# 2. 选择备份文件
echo ""
echo "可用的备份文件:"
ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "无备份文件"

echo ""
read -p "输入备份文件路径 (回车使用最新): " BACKUP_FILE

if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.tar.gz | head -1)
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

echo "使用备份: $BACKUP_FILE"

# 3. 停止服务
echo ""
echo "🛑 停止所有服务..."
pm2 stop qmx-backend || true
pm2 stop qmx-frontend || true
echo "   服务已停止"

# 4. 备份当前 PostgreSQL 数据 (可选)
if command -v pg_dump &> /dev/null; then
  echo ""
  echo "💾 备份当前 PostgreSQL 数据..."
  pg_dump -q -U postgres qmx_db > "$BACKUP_DIR/postgres_rollback_backup_$CURRENT_DATE.sql"
  echo "   PostgreSQL 数据已备份"
fi

# 5. 恢复 MongoDB 数据
echo ""
echo "💾 恢复 MongoDB 数据..."

EXTRACT_DIR="/tmp/mongodb_restore_$CURRENT_DATE"
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"

tar -xzf "$BACKUP_FILE" -C "$EXTRACT_DIR"
EXTRACTED_DB=$(find "$EXTRACT_DIR" -name "qmx" -type d | head -1)

mongorestore \
  --drop \
  --quiet \
  "$EXTRACTED_DB"

echo "   ✅ MongoDB 数据恢复完成"

# 清理临时文件
rm -rf "$EXTRACT_DIR"

# 6. 验证 MongoDB 数据
echo ""
echo "🔍 验证 MongoDB 数据..."
STUDENT_COUNT=$(mongo --quiet --eval "use qmx; db.students.countDocuments()")
CASH_COUNT=$(mongo --quiet --eval "use qmx; db.cashs.countDocuments()")

echo "   students: $STUDENT_COUNT 条"
echo "   cashs: $CASH_COUNT 条"

if [ "$STUDENT_COUNT" -eq 0 ]; then
  echo "⚠️ 警告: students 数据为空"
fi

# 7. 恢复代码
echo ""
echo "♻️ 恢复代码到 pre-migration 版本..."
if ! git rev-parse pre-migration >/dev/null 2>&1; then
  echo "❌ 未找到 pre-migration 标签"
  exit 1
fi

git checkout pre-migration
npm install --silent
echo "   ✅ 代码恢复完成"

# 8. 启动 MongoDB (如果需要)
if ! pgrep -x "mongod" > /dev/null; then
  echo ""
  echo "🚀 启动 MongoDB..."
  sudo systemctl start mongod
  sleep 3
fi

# 9. 启动服务
echo ""
echo "🚀 启动服务..."
pm2 start npm --name qmx-backend -- run backend
pm2 start npm --name qmx-frontend -- run dev

echo "   服务已启动"

# 10. 健康检查
echo ""
echo "🔍 健康检查..."
sleep 5

if curl -f http://localhost:3001/health > /dev/null 2>&1; then
  echo "   ✅ 后端服务正常"
else
  echo "   ❌ 后端服务异常"
  echo ""
  echo "日志:"
  pm2 logs qmx-backend --lines 20 --nostream
  exit 1
fi

if curl -f http://localhost:1420 > /dev/null 2>&1; then
  echo "   ✅ 前端服务正常"
else
  echo "   ❌ 前端服务异常"
fi

echo ""
echo "══════════════════════════════════════════"
echo "✅ 完整回滚成功！"
echo "══════════════════════════════════════════"
echo ""
echo "📋 后续事项:"
echo "   1. 验证所有数据完整性"
echo "   2. 检查日志确认无错误"
echo "   3. 通知用户系统已恢复"
echo "   4. 分析回滚原因"
echo ""
```

---

## 5. 回滚方案 C: 双写回滚 (渐进式)

### 5.1 适用场景

- 大规模生产环境
- 无法接受停机
- 长期双写验证期

### 5.2 双写架构

```
┌──────────────┐
│   请求       │
└──────┬───────┘
       ▼
┌────────────────────────────────┐
│   应用层 (双写适配器)           │
├────────────────────────────────┤
│  1. 写入 PostgreSQL            │
│  2. 异步写入 MongoDB (备份)    │
└────────────────────────────────┘
       │              │
       ▼              ▼
┌──────────────┐  ┌──────────────┐
│ PostgreSQL   │  │  MongoDB     │
│  (主数据库)   │  │  (备份)      │
└──────────────┘  └──────────────┘
```

### 5.3 双写代码示例

```typescript
// backend/src/db/dual-writer.ts

export class DualWriteAdapter {
  /**
   * 执行双写操作
   */
  static async write<T>(
    primary: (tx: Transaction) => Promise<T>,
    replica: () => Promise<void>,
    operation: string
  ): Promise<T> {
    // 1. 执行主写入 (PostgreSQL)
    const result = await primary(await db.begin());

    // 2. 异步执行副本写入 (MongoDB)
    replica().catch(error => {
      console.error(`双写失败 [${operation}]:`, error);
      // 记录到失败队列，后续重试
      this.recordFailedWrite(operation, error);
    });

    return result;
  }

  /**
   * 记录失败的双写操作
   */
  private static recordFailedWrite(operation: string, error: any) {
    // 写入失败日志或消息队列
  }
}

// 在控制器中使用
router.post('/students', async (req, res, next) => {
  return await DualWriteAdapter.write(
    async (pgTx) => {
      // PostgreSQL 写入
      const [student] = await pgTx.insert(students).values(req.body).returning();
      await pgTx.commit();
      return student;
    },
    async () => {
      // MongoDB 备份写入
      await Student.create(req.body);
    },
    'create_student'
  );
});
```

---

## 6. 回滚验证检查清单

### 6.1 数据验证

- [ ] MongoDB 数据记录数与备份一致
- [ ] 关键数据的抽样验证
- [ ] 财务余额总和验证
- [ ] 外键关系完整性

```bash
# 快速验证脚本
mongo --eval "
  use qmx;
  print('students:', db.students.countDocuments());
  print('cashs:', db.cashs.countDocuments());
  print('installmentplans:', db.installmentplans.countDocuments());
  print('installments:', db.installments.countDocuments());
"
```

### 6.2 功能验证

- [ ] 健康检查端点正常
- [ ] 前端可正常加载
- [ ] 学员列表可查看
- [ ] 可以创建新学员
- [ ] 可以创建交易
- [ ] 可以创建分期计划
- [ ] 可以支付分期

### 6.3 性能验证

- [ ] API 响应时间正常
- [ ] 无慢查询
- [ ] 无内存泄漏
- [ ] 连接池正常

---

## 7. 回滚后处理

### 7.1 通知相关方

```bash
# 通知模板
echo "系统已回滚完成

回滚时间: $(date)
回滚类型: $ROLLBACK_TYPE
回滚原因: $ROLLBACK_REASON

当前状态:
- 数据库: MongoDB
- 服务状态: 运行中
- 健康状态: 正常

如果有任何问题，请联系:
- 技术支持: tech@example.com
- 紧急电话: +86-xxx-xxxx-xxxx"
```

### 7.2 问题分析

1. 收集错误日志
2. 分析回滚原因
3. 制定修复方案
4. 更新迁移文档
5. 重新风险评估

### 7.3 回滚时间线

```
发现问题 (T0)
    ↓
评估影响 (T+5分钟)
    ↓
决策回滚 (T+10分钟)
    ↓
执行回滚 (T+10-20分钟)
    ↓
验证恢复 (T+20-25分钟)
    ↓
通知相关方 (T+25分钟)
    ↓
问题分析 (T+60分钟)
```

---

## 8. 总结

### 8.1 回滚方案对比

| 方案 | 停机时间 | 数据损失 | 复杂度 | 推荐场景 |
|------|---------|---------|--------|----------|
| **A - 快速回滚** | < 5分钟 | 无 | 低 | 代码问题 |
| **B - 完整回滚** | 15-30分钟 | 无 | 中 | 数据问题 |
| **C - 双写回滚** | 无 | 无 | 高 | 大规模生产 |

### 8.2 最佳实践

1. **始终先备份**
2. **测试回滚脚本**
3. **预留回滚时间窗口**
4. **团队熟悉回滚流程**
5. **记录所有操作日志**
6. **回滚后严格验证**

---

**迁移方案总览**: 返回 [00-INDEX.md](./00-INDEX.md)
