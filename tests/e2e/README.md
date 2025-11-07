# E2E 测试环境使用指南

## 概述

本项目使用 Playwright 进行端到端（E2E）测试，支持多浏览器、多设备测试，并集成了完整的 CI/CD 流程。

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装项目依赖
pnpm install

# 安装 Playwright 浏览器
pnpm run e2e:install
```

### 2. 环境配置

复制测试环境配置文件：

```bash
cp .env.test .env
```

确保以下配置正确：

```env
# 前端配置
VITE_API_BASE_URL=http://localhost:3001/api/v1

# 后端配置
PORT=3001
NODE_ENV=test

# 测试数据库
MONGODB_URI=mongodb://localhost:27017/qmx_test
```

### 3. 启动服务

```bash
# 启动后端服务
pnpm run backend

# 启动前端服务（新终端）
pnpm run dev
```

### 4. 运行测试

```bash
# 运行所有 E2E 测试
pnpm run e2e

# 运行测试并显示浏览器（调试模式）
pnpm run e2e:headed

# 调试模式（逐步执行）
pnpm run e2e:debug

# 查看测试报告
pnpm run e2e:report
```

## 📁 目录结构

```
tests/e2e/
├── fixtures.ts           # 测试夹具和自定义断言
├── global-setup.ts       # 全局测试设置
├── global-teardown.ts    # 全局测试清理
├── smoke/               # 冒烟测试
│   └── smoke.spec.ts
├── features/            # 功能测试
│   └── student-management.spec.ts
└── README.md           # 本文档
```

## 🎭 测试类型

### 1. 冒烟测试 (Smoke Tests)

位置：`tests/e2e/smoke/`

目的：验证应用基本功能是否正常

包含：
- 应用首页加载
- 服务健康检查
- API 代理配置
- 页面资源加载
- 控制台错误检查

### 2. 功能测试 (Feature Tests)

位置：`tests/e2e/features/`

目的：验证具体业务功能

包含：
- 学生管理功能
- 财务管理功能
- 会员管理功能
- 响应式布局测试

## 🔧 配置说明

### Playwright 配置

配置文件：`playwright.config.ts`

主要特性：
- 多浏览器支持（Chrome、Firefox、Safari）
- 移动端测试支持
- 自动截图和视频录制
- Trace 生成（失败时）
- 自动服务启动

### 测试环境隔离

- 使用独立的测试数据库：`qmx_test`
- 测试数据自动准备和清理
- 环境变量隔离

## 📊 测试报告

### 本地查看报告

```bash
# 启动报告服务器
pnpm run e2e:report
```

报告包含：
- 测试执行结果
- 失败截图
- 录制视频
- 执行追踪（Trace）

### CI/CD 报告

- GitHub Actions 自动生成报告
- 测试结果自动上传为 artifacts
- PR 自动评论测试结果

## 🛠️ 开发指南

### 编写新测试

1. 导入必要的夹具：

```typescript
import { test, expect } from '../fixtures';
```

2. 使用自定义夹具：

```typescript
test('我的测试', async ({ page, api, testData }) => {
  // 测试逻辑
});
```

3. 使用自定义断言：

```typescript
await expect(element).toBeVisibleAndEnabled();
expect(apiResponse).toBeValidApiResponse();
```

### 测试最佳实践

1. **测试独立性**：每个测试应该独立运行
2. **数据隔离**：使用测试夹具提供的数据
3. **等待策略**：使用 Playwright 的自动等待机制
4. **错误处理**：适当的错误捕获和报告
5. **命名规范**：使用描述性的测试名称

### 调试技巧

1. **使用调试模式**：

```bash
pnpm run e2e:debug
```

2. **分步执行**：在 VSCode 中使用 Playwright 扩展
3. **查看 Trace**：失败时查看详细执行追踪
4. **浏览器开发者工具**：使用 headed 模式

## 🔄 CI/CD 集成

### GitHub Actions

工作流文件：`.github/workflows/e2e.yml`

触发条件：
- Push 到 main/release 分支
- Pull Request 到 main/release 分支
- 手动触发

执行步骤：
1. 环境准备
2. 依赖安装
3. 服务启动
4. 测试执行
5. 结果上传

### 环境变量

CI 环境自动设置：
- `CI=true`
- `NODE_ENV=test`
- `BASE_URL=http://localhost:1420`
- `VITE_API_BASE_URL=http://localhost:3001/api/v1`

## 🧪 测试数据管理

### 自动数据准备

测试开始前自动：
1. 清空测试数据库
2. 创建示例学生数据
3. 创建示例财务记录
4. 创建示例分期记录

### 数据清理

测试结束后自动：
1. 清理测试数据
2. 重置数据库状态
3. 收集测试结果摘要

### 手动数据管理

```bash
# 准备测试数据
curl -X POST http://localhost:3001/api/v1/test/seed

# 清理测试数据
curl -X POST http://localhost:3001/api/v1/test/cleanup

# 查看数据状态
curl http://localhost:3001/api/v1/test/status
```

## 🐛 故障排除

### 常见问题

1. **服务启动失败**
   - 检查端口是否被占用
   - 确认环境变量配置
   - 查看服务日志

2. **数据库连接失败**
   - 确认 MongoDB 服务状态
   - 检查连接字符串
   - 验证数据库权限

3. **测试超时**
   - 增加测试超时时间
   - 检查网络连接
   - 优化等待策略

4. **浏览器启动失败**
   - 重新安装 Playwright 浏览器
   - 检查系统依赖
   - 确认显示配置

### 日志查看

```bash
# 查看详细测试日志
pnpm run e2e --reporter=list

# 查看服务日志
pnpm run backend  # 后端日志
pnpm run dev      # 前端日志
```

## 📈 性能优化

### 并行执行

- 默认并行运行测试
- CI 环境限制并行数
- 使用 `workers` 配置控制

### 资源复用

- WebServer 自动复用
- 浏览器上下文隔离
- 数据库连接池

### 缓存策略

- pnpm 缓存
- Playwright 浏览器缓存
- 测试结果缓存

## 🔮 扩展功能

### 添加新浏览器

在 `playwright.config.ts` 中添加新项目：

```typescript
{
  name: 'edge',
  use: { ...devices['Desktop Edge'] },
}
```

### 添加移动设备测试

```typescript
{
  name: 'Mobile Chrome',
  use: { ...devices['Pixel 5'] },
}
```

### 集成视觉回归测试

```bash
pnpm add -D @playwright/visual-expect
```

## 📚 相关文档

- [Playwright 官方文档](https://playwright.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [项目架构文档](./CLAUDE.md)
- [后端 API 文档](../backend/README.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 编写测试用例
4. 确保所有测试通过
5. 提交 Pull Request

## 📞 支持

如有问题，请：
1. 查看本文档
2. 检查 GitHub Issues
3. 联系项目维护者

---

**最后更新**: 2025-11-07
**版本**: 1.0.0