# CI/CD 快速参考指南

此文档提供QMX项目CI/CD工作流的快速参考。

## 📋 工作流概览

### 主CI流程 (.github/workflows/CI.yml)

| 阶段 | 作业 | 时间 | 依赖 |
|------|------|------|------|
| 1️⃣ | setup | 15分钟 | - |
| 2️⃣ | frontend-test | 7分钟 | setup |
| 2️⃣ | backend-test | 7分钟 | setup |
| 3️⃣ | build | 10分钟 | frontend-test, backend-test |
| ✅ | test-summary | 1分钟 | 所有作业 |

**总时间**: ~15-17分钟（前端和后端并行执行）

### E2E流程 (.github/workflows/e2e.yml)

| 步骤 | 时间 | 说明 |
|------|------|------|
| 依赖安装 | 3-5分钟 | 使用缓存 |
| Playwright安装 | 2-3分钟 | 浏览器下载 |
| MongoDB启动 | 10秒 | Docker容器 |
| 服务启动 | 2-3分钟 | 前端+后端 |
| 测试执行 | 3-5分钟 | Chromium |
| 清理 | 30秒 | 容器和进程 |

**总时间**: ~9-11分钟

## 🚀 快速启动

### 本地测试

```bash
# 前端单测
pnpm test

# 后端单测
pnpm test:backend

# 一次性运行（全部）
pnpm test:frontend && pnpm test:backend

# E2E测试
pnpm run e2e

# 核心E2E测试
pnpm run e2e:core
```

### 本地模拟CI环境

```bash
# 使用与CI相同的环境变量
export NODE_ENV=test
export TZ=UTC
export CI=true

# 安装依赖（使用frozen lockfile）
pnpm install --frozen-lockfile

# 运行完整流程
pnpm build:frontend && \
pnpm test:frontend && \
pnpm build:backend && \
pnpm test:backend
```

## 📊 缓存策略

### 缓存类型

```
┌─────────────────────────────────────┐
│ GitHub Actions Cache                │
├─────────────────────────────────────┤
│ ✓ pnpm-store (node modules)         │ ~1-2分钟节省
│ ✓ Playwright (浏览器)               │ ~2-3分钟节省
│ ✓ Vite/Vitest (编译缓存)            │ ~30秒节省
└─────────────────────────────────────┘
```

### 缓存命中条件

缓存使用文件哈希作为键：

```yaml
key: ${{ runner.os }}-type-${{ hashFiles('**/pnpm-lock.yaml') }}
```

- ✅ **命中**: pnpm-lock.yaml无变化
- ❌ **失效**: 添加/更新依赖后

### 清理缓存

如果需要清理缓存（Actions标签 → 缓存 → 删除）：

```bash
# 本地清理
pnpm store prune      # 移除未使用的包
rm -rf node_modules   # 完全重新安装
pnpm install
```

## 🔐 环境变量和Secrets

### 必需的Secrets

| Secret | 用途 | 示例 |
|--------|------|------|
| `BACKEND_TEST_URL` | API地址 | `http://localhost:3001/api/v1` |
| `MONGO_TEST_URI` | 数据库 | `mongodb://localhost:27017/qmx_test` |
| `JWT_SECRET_TEST` | JWT密钥 | `test-secret-min-32-chars` |

### 设置Secrets

1. 仓库Settings → Secrets and variables → Actions
2. 点击"New repository secret"
3. 添加上表中的Secrets

**详见**: [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)

## ✅ 检查项

### 工作流失败时的检查清单

- [ ] 检查工作流日志获取具体错误
- [ ] 验证Secrets是否正确配置
- [ ] 确认.env.test文件存在
- [ ] 检查dependencies是否安装成功
- [ ] 查看test-results/和playwright-report/中的报告
- [ ] 检查services.log（E2E）中的错误信息

### 常见失败和解决方案

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `npm ERR!` | 依赖安装失败 | 清理缓存，重试 |
| `ECONNREFUSED` | 服务启动失败 | 查看services.log，检查MongoDB连接 |
| `timeout` | 服务启动超时 | 增加超时值或检查资源使用 |
| `Cannot find module` | 依赖缺失 | 运行`pnpm install`，更新lock文件 |
| `jest/vitest not found` | 全局命令失败 | 使用`pnpm run`前缀 |

## 📈 性能指标

### 目标

| 指标 | 目标 | 状态 |
|------|------|------|
| 前端单测 | 5-7分钟 | ✅ |
| 后端单测 | 5-7分钟 | ✅ |
| E2E | <10分钟 | ✅ |
| 总耗时 | <15分钟 | ✅ |
| 缓存节省 | 4-5分钟 | ✅ |

### 监控

在Actions标签查看：
1. 每个工作流的执行时间
2. 缓存命中率（上方的缓存步骤日志）
3. 失败率和重试次数

## 🔧 故障排查

### MongoDB连接错误

```
ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:27017
```

**解决**:
```bash
# 本地启动MongoDB
docker run -d -p 27017:27017 mongo:7-alpine

# 验证连接
docker exec mongodb-test mongosh --eval "db.adminCommand('ping')"
```

### 端口被占用

```
EADDRINUSE: address already in use :::3001
```

**解决**:
```bash
# 找出占用端口的进程
lsof -i :3001
# 或
netstat -tlnp | grep 3001

# 杀死进程
kill -9 <PID>
```

### 测试超时

```
Test timeout - exceeded timeout of 30000ms
```

**解决**:
1. 检查setupTests.ts中的超时配置
2. 增加jest.config.ts中的testTimeout
3. 分析是否有无限循环或阻塞操作

### 缓存失效

如果修改了dependencies后缓存未更新：

```bash
# 手动清理缓存（GitHub Actions UI）
# Settings → Secrets and variables → Actions → Manage cache

# 或本地验证
pnpm install --frozen-lockfile  # 应该重新安装
```

## 📝 工作流配置

### 添加新的测试作业

1. 编辑`.github/workflows/CI.yml`
2. 在适当的阶段添加job：

```yaml
my-new-test:
  runs-on: ubuntu-latest
  needs: setup  # 确保依赖
  timeout-minutes: 10
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20.x'
    # ... 其他步骤
```

3. 如果是最后阶段，添加到`test-summary`的`needs`

### 修改超时

在工作流文件中更新`timeout-minutes`:

```yaml
jobs:
  my-job:
    timeout-minutes: 15  # 修改此值
```

### 添加新的Secrets

1. 在工作流中引用Secrets：
```yaml
env:
  MY_SECRET: ${{ secrets.MY_SECRET }}
```

2. 在仓库Settings中添加Secret值

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [CI_IMPROVEMENTS.md](./CI_IMPROVEMENTS.md) | 详细的改进说明 |
| [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md) | Secrets配置指南 |
| [TESTING.md](./TESTING.md) | 项目测试指南 |
| [E2E_STABILITY_IMPROVEMENTS.md](./E2E_STABILITY_IMPROVEMENTS.md) | E2E测试改进 |

## 🎯 最佳实践

### 本地验证

在提交PR前，本地运行：

```bash
# 1. 安装依赖
pnpm install

# 2. 前端测试
pnpm test:frontend

# 3. 后端测试
pnpm test:backend

# 4. 构建
pnpm build:frontend
pnpm build:backend

# 5. E2E测试（可选，耗时较长）
pnpm run e2e:core
```

### 提交消息规范

清晰的消息帮助快速定位失败原因：

```
feat: 添加新功能

# 不好
update code

# 好的
feat: 添加学生导出功能
```

### 处理flaky测试

如果测试偶发失败：

1. 检查是否有时间敏感的代码
2. 使用固定时间进行测试
3. 避免依赖外部API
4. 确保正确的清理（afterEach）

## 🆘 获取帮助

### 查看日志

1. 进入GitHub Actions运行记录
2. 展开失败的步骤
3. 查看完整的错误输出
4. 下载artifacts（报告、日志、截图）

### 调试技巧

```bash
# 本地调试特定测试
pnpm test -- --testNamePattern="your test name"

# 监听模式进行开发
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

---

**快速链接**: 
- 🔗 [GitHub Actions文档](https://docs.github.com/en/actions)
- 🔗 [pnpm文档](https://pnpm.io/)
- 🔗 [Vitest文档](https://vitest.dev/)
- 🔗 [Jest文档](https://jestjs.io/)
- 🔗 [Playwright文档](https://playwright.dev/)

**最后更新**: 2025年11月8日

