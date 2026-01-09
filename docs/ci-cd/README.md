# CI/CD 文档

本目录包含QMX项目的持续集成和持续部署(CI/CD)相关文档。

## 📋 文档列表

### 快速参考
- **[CI/CD快速参考](./quick-reference.md)** ⭐
  - 工作流概览
  - 常用命令
  - 故障排查
  - 最佳实践

### 配置指南
- **[GitHub Actions配置](./github-actions.md)**
  - Secrets配置
  - 环境变量设置
  - 工作流触发条件

### 详细文档
- **[代码覆盖率](./coverage.md)**
  - 覆盖率配置
  - Codecov集成
  - 覆盖率提升策略

- **[CI完成总结](./CI_COMPLETION_SUMMARY.md)**
  - CI/CD实现历史
  - 问题和解决方案

- **[CI改进](./CI_IMPROVEMENTS.md)**
  - 性能优化
  - 改进建议

- **[CI实施清单](./CI_IMPLEMENTATION_CHECKLIST.md)**
  - 实施步骤
  - 检查项

## 🚀 快速开始

### 本地模拟CI环境
```bash
# 设置环境变量
export NODE_ENV=test
export TZ=UTC
export CI=true

# 安装依赖
pnpm install --frozen-lockfile

# 运行完整流程
pnpm build:frontend && \
pnpm test:frontend && \
pnpm build:backend && \
pnpm test:backend
```

### 查看CI状态
1. 访问 [GitHub Actions](https://github.com/H-Chris233/QMX/actions)
2. 查看最新的工作流运行
3. 下载artifacts查看详细报告

## 📊 工作流概览

### 主CI流程
```
setup (15min)
  ├─→ frontend-test (7min, 并行)
  └─→ backend-test (7min, 并行)
         └─→ build (10min)
              └─→ test-summary (1min)
```

**总耗时**: ~15-17分钟

### E2E流程
```
依赖安装 → Playwright安装 → PostgreSQL启动 →
服务启动 → 测试执行 → 清理
```

**总耗时**: ~9-11分钟

## ⚡ 性能优化

### 缓存策略
- ✅ pnpm-store缓存 (节省1-2分钟)
- ✅ Playwright浏览器缓存 (节省2-3分钟)
- ✅ Vite/Vitest编译缓存 (节省30秒)

### 并行执行
- ✅ 前端和后端测试并行
- ✅ 构建步骤优化
- ✅ 依赖安装优化

## 🔧 故障排查

### 常见问题

#### PostgreSQL连接失败
```bash
# 启动PostgreSQL容器
docker run -d -p 5432:5432 postgres:15-alpine

# 验证连接
docker exec postgres-test psql -U postgres -c "SELECT 1"
```

#### 端口被占用
```bash
# 查找占用进程
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

#### 缓存问题
```bash
# 清理pnpm缓存
pnpm store prune

# 完全重新安装
rm -rf node_modules
pnpm install
```

## 📈 CI/CD指标

### 当前状态
| 指标 | 目标 | 当前 | 状态 |
|------|------|------|------|
| 前端单测 | 5-7分钟 | ~7分钟 | ✅ |
| 后端单测 | 5-7分钟 | ~7分钟 | ✅ |
| E2E测试 | <10分钟 | ~9-11分钟 | ✅ |
| 总耗时 | <15分钟 | ~15-17分钟 | ✅ |
| 缓存节省 | 4-5分钟 | ~4分钟 | ✅ |

### 改进历史
- **2025-01**: CI/CD执行时间优化75%
- **2024-12**: 实现并行测试
- **2024-11**: 添加缓存策略

## 📚 相关资源

- [GitHub Actions官方文档](https://docs.github.com/en/actions)
- [pnpm文档](https://pnpm.io/)
- [Codecov文档](https://docs.codecov.com/)

---

**最后更新**: 2025-01-09
**维护者**: H-Chris233
