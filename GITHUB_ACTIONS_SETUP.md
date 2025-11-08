# GitHub Actions Secrets 配置指南

本指南说明如何为QMX项目的GitHub Actions工作流配置所需的Secrets和环境变量。

## 快速开始

### 1. 访问仓库Settings

1. 进入GitHub仓库页面
2. 点击 `Settings` 标签
3. 左侧菜单选择 `Secrets and variables`
4. 选择 `Actions` 标签

### 2. 添加Secrets

点击 `New repository secret` 按钮，按照下表添加所需的Secrets。

## 需要配置的Secrets

### 测试环境配置

#### 1. 后端API配置

**Secret名称**: `BACKEND_TEST_URL`

**值**: 
```
http://localhost:3001/api/v1
```

**用途**: E2E测试中的后端API地址

**说明**: 通常在CI环境中是localhost，在生产环境可能需要修改

---

#### 2. MongoDB测试数据库连接

**Secret名称**: `MONGO_TEST_URI`

**选项A** - 本地MongoDB（推荐用于CI）:
```
mongodb://localhost:27017/qmx_test
```

**选项B** - MongoDB Atlas云数据库:
```
mongodb+srv://username:password@cluster.mongodb.net/qmx_test
```

**用途**: 后端和E2E测试的数据库连接

**说明**:
- 本地方式：CI中使用Docker容器启动MongoDB
- 云方式：需要创建MongoDB Atlas账户和用户

---

#### 3. JWT密钥（可选 - 目前不需要，使用.env.test）

**Secret名称**: `JWT_SECRET_TEST`

**值**:
```
test-jwt-secret-key-for-testing-only-min-32-chars
```

**用途**: 测试中生成JWT令牌

**说明**: 最少32个字符的安全字符串

---

### Node.js和包管理器版本（全局环境变量）

这些已在workflow文件中作为全局变量定义，无需配置Secrets：

```yaml
env:
  NODE_VERSION: '20.x'
  PNPM_VERSION: '10'
```

---

## 工作流中的使用方式

### 在CI.yml中使用

```yaml
jobs:
  setup:
    steps:
      - name: Set environment variables
        run: |
          echo "NODE_ENV=test" >> $GITHUB_ENV
          echo "BACKEND_URL=${{ secrets.BACKEND_TEST_URL }}" >> $GITHUB_ENV
          echo "MONGODB_URI=${{ secrets.MONGO_TEST_URI }}" >> $GITHUB_ENV
```

### 在e2e.yml中使用

```yaml
jobs:
  e2e:
    steps:
      - name: Setup test environment
        env:
          BACKEND_URL: ${{ secrets.BACKEND_TEST_URL }}
          MONGODB_URI: ${{ secrets.MONGO_TEST_URI }}
        run: |
          # 环境变量自动注入到步骤
          echo "Backend: $BACKEND_URL"
          echo "MongoDB: $MONGODB_URI"
```

---

## 环境特定的配置

### 本地开发环境

创建`.env.local`（不要提交到Git）:

```env
# 本地开发
NODE_ENV=development
PORT=3001
VITE_API_BASE_URL=http://localhost:3001/api/v1

# MongoDB本地
MONGODB_URI=mongodb://localhost:27017/qmx_dev

# JWT
JWT_SECRET=local-jwt-secret-key-for-development-only

# 日志
LOG_LEVEL=debug
```

### 测试环境

使用`.env.test`（已提交到仓库）:

```env
# 测试环境
NODE_ENV=test
PORT=3001
VITE_API_BASE_URL=http://localhost:3001/api/v1

# MongoDB测试
MONGODB_URI=mongodb://localhost:27017/qmx_test

# JWT测试
JWT_SECRET=test-jwt-secret-key-for-e2e-testing-only

# 日志
LOG_LEVEL=error
```

### 生产环境（不适用于CI）

在实际部署中设置的环境变量：

```env
NODE_ENV=production
PORT=3001
VITE_API_BASE_URL=https://api.example.com/api/v1

# MongoDB生产（使用Atlas）
MONGODB_URI=mongodb+srv://produser:password@production-cluster.mongodb.net/qmx_prod

# 安全JWT密钥
JWT_SECRET=<strong-random-key-min-32-chars>

# 日志
LOG_LEVEL=warn
```

---

## 验证配置

### 检查Secrets是否正确设置

1. 进入仓库Settings → Secrets
2. 确认以下Secrets存在：
   - ✅ `BACKEND_TEST_URL`
   - ✅ `MONGO_TEST_URI`
   - ✅ `JWT_SECRET_TEST`（可选）

### 运行测试工作流验证

1. 进入 `Actions` 标签
2. 选择 `Full-Stack CI` 或 `E2E Tests` 工作流
3. 点击 `Run workflow`
4. 检查工作流是否正确使用了Secrets

#### 在工作流日志中确认

工作流运行后，检查日志中是否显示：
```
✓ Dependencies installed successfully
✓ Backend service is ready
✓ Frontend service is ready
✓ All tests passed
```

---

## 更新和维护

### 定期更新Secrets

**建议频率**: 每3个月

1. 更新敏感密钥（JWT_SECRET_TEST）
2. 检查MongoDB连接是否可用
3. 验证URL和配置是否仍然有效

### 处理失败的工作流

如果CI工作流失败，检查项：

1. **连接错误**：验证`MONGO_TEST_URI`是否可达
2. **认证错误**：确认MongoDB用户名和密码正确
3. **网络错误**：检查防火墙和安全组规则

### 轮转密钥（安全最佳实践）

当需要更改密钥时：

1. 在MongoDB/系统中生成新密钥
2. 在GitHub Secrets中更新相应的Secret
3. 运行工作流验证新密钥有效
4. 在旧系统中禁用旧密钥

---

## 常见问题

### Q: 为什么工作流访问不到Secrets？

**A**: 检查以下几点：
1. Secrets已正确添加到正确的仓库（非fork）
2. 工作流引用的Secret名称完全匹配（区分大小写）
3. Secret值不为空
4. 仓库未被fork（fork需要自己配置Secrets）

### Q: 如何在fork中配置Secrets？

**A**: 
1. Fork仓库后进入您的fork
2. 进入Settings → Secrets
3. 添加相同的Secrets
4. 工作流将使用fork中的Secrets值

### Q: 我能在日志中看到Secret值吗？

**A**: 不能。GitHub Actions会自动隐藏Secret值：
- 日志中显示：`***`
- 真实值仅在步骤执行时可用
- 防止意外泄露

### Q: 如何测试MongoDB连接？

**A**: 在工作流步骤中添加测试：
```yaml
- name: Test MongoDB connection
  run: |
    npm install -g mongodb-cli-tools
    mongosh "${{ secrets.MONGO_TEST_URI }}" --eval "db.adminCommand('ping')"
```

### Q: 本地开发时如何使用这些配置？

**A**: 创建`.env.local`文件（不提交到Git）：
```bash
# 复制.env.test作为基础
cp .env.test .env.local

# 修改为本地值
# MONGODB_URI=mongodb://localhost:27017/qmx_dev
# PORT=3001
```

### Q: 如何轮转/更新Secrets？

**A**: 
1. 在GitHub Secrets页面找到要更新的Secret
2. 点击编辑图标
3. 输入新值
4. 点击Update secret
5. 新值在下一个工作流运行时生效

---

## 安全最佳实践

### ✅ 推荐做法

1. **最小权限原则**
   - Secrets仅包含必要的敏感信息
   - 定期审计哪些工作流可以访问哪些Secrets

2. **强密钥**
   - 密钥至少32个字符
   - 使用大小写字母、数字和特殊符号
   - 避免使用字典中的单词

3. **定期轮转**
   - 每3个月更新一次
   - 如果泄露立即更新

4. **限制访问**
   - 仅在必要的工作流中使用Secrets
   - 使用GitHub Organization的Secret共享功能管理

### ❌ 避免做法

1. **不要在代码中硬编码Secrets**
2. **不要在日志中打印Secrets**
3. **不要在PR中提交包含Secrets的代码**
4. **不要与未授权的人共享Secrets**

---

## 工作流变量vs Secrets

### 何时使用Secrets

| 信息类型 | 是否敏感 | 示例 |
|---------|---------|------|
| API密钥 | ✅ | `JWT_SECRET`, `API_KEY` |
| 数据库密码 | ✅ | MongoDB连接字符串 |
| OAuth令牌 | ✅ | GitHub Token, npm Token |
| 用户名/密码 | ✅ | 数据库凭证 |

### 何时使用环境变量

| 信息类型 | 是否敏感 | 示例 |
|---------|---------|------|
| Node版本 | ❌ | `NODE_VERSION=20.x` |
| 端口号 | ❌ | `PORT=3001` |
| URL路径 | ❌ | `VITE_API_BASE_URL=/api/v1` |
| 功能标志 | ❌ | `ENABLE_DEBUG=true` |

---

## 疑难解答

### 工作流失败：MongoDB连接超时

**症状**: 
```
timeout connecting to MongoDB
```

**解决**:
1. 验证`MONGO_TEST_URI`格式正确
2. 检查网络连接
3. 重新运行工作流
4. 检查MongoDB Atlas IP白名单（如使用云数据库）

### 工作流失败：Authentication failed

**症状**:
```
authentication failed: 401
```

**解决**:
1. 验证Secret值正确无误
2. 检查MongoDB用户权限
3. 确认MongoDB用户仍然存在
4. 重置密码并更新Secret

### 工作流失败：Network unreachable

**症状**:
```
Cannot reach API at {{ BACKEND_TEST_URL }}
```

**解决**:
1. 检查URL是否正确（应该是localhost在CI中）
2. 验证后端服务是否正确启动
3. 检查Docker网络配置
4. 查看后端启动日志

---

## 联系和支持

如对Secrets配置有疑问：

1. 查看GitHub Actions文档：https://docs.github.com/en/actions
2. 检查工作流日志获取具体错误信息
3. 联系项目维护者

---

**最后更新**: 2025年11月8日
**版本**: 1.0
**状态**: ✅ 适用于生产环境

