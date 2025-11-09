# PR: 统一覆盖率配置与报告上传

## 📋 变更概述

本 PR 实现了前后端测试覆盖率的统一配置，建立了完整的覆盖率报告机制，并集成到 CI/CD 流程中。

## 🎯 目标

- ✅ 统一前后端覆盖率配置标准
- ✅ 生成标准化的覆盖率报告（lcov, html, json）
- ✅ 在 CI 中上传覆盖率报告
- ✅ 支持 Codecov 集成（可选）
- ✅ 在 PR 中显示覆盖率摘要
- ✅ 建立稳定的覆盖率基准线

## 📝 主要变更

### 配置文件

#### 1. 前端覆盖率配置
- **文件**: `vitest.config.ts`
- **变更**: 
  - 添加完整的 `coverage` 配置块
  - 使用 @vitest/coverage-v8 provider
  - 配置 include/exclude 规则
  - 设置渐进式阈值（25%, 75%, 50%, 25%）

#### 2. 后端覆盖率配置
- **文件**: `backend/jest.config.ts`
- **变更**:
  - 完善 `collectCoverageFrom` 规则
  - 添加 `coverageThreshold` 配置
  - 设置渐进式阈值（50%, 40%, 45%, 50%）

#### 3. CI/CD 配置
- **文件**: `.github/workflows/CI.yml`
- **变更**:
  - 前端测试使用 `test:frontend:coverage`
  - 后端测试使用 `test:backend:coverage`
  - 上传覆盖率报告为 artifacts
  - 集成 Codecov 上传（需要 CODECOV_TOKEN）
  - 在 test-summary 中显示覆盖率摘要

#### 4. Codecov 配置
- **文件**: `codecov.yml`
- **变更**: 新增完整的 Codecov 配置

#### 5. .gitignore
- **文件**: `.gitignore`
- **变更**: 添加覆盖率目录到忽略列表

### NPM 脚本

**文件**: `package.json`

新增脚本:
```json
"test:frontend:coverage": "vitest run --coverage",
"test:backend:coverage": "pnpm run --filter qmx-backend test:coverage",
"coverage": "bash scripts/check-coverage.sh",
"coverage:open": "concurrently \"open coverage/index.html\" \"open backend/coverage/index.html\""
```

### 文档

#### 新增文档:
1. **COVERAGE.md**: 完整的覆盖率使用指南（208行）
2. **.github/CODECOV_SETUP.md**: Codecov 设置指南（150行）
3. **COVERAGE_IMPLEMENTATION.md**: 实施总结文档（本 PR 的详细说明）

#### 新增脚本:
1. **scripts/check-coverage.sh**: 覆盖率检查脚本

## 📊 当前覆盖率状态

### 前端
- **Statements**: 26.51%
- **Branches**: 77.15%
- **Functions**: 52.26%
- **Lines**: 26.51%

### 后端
- **Statements**: 53.9%
- **Branches**: 45.86%
- **Functions**: 50%
- **Lines**: 54.87%

## 🎯 覆盖率策略

采用**渐进式提升策略**，而非激进的高阈值：

### 当前阈值（基准线）
- **前端**: statements ≥25%, branches ≥75%, functions ≥50%, lines ≥25%
- **后端**: statements ≥50%, branches ≥40%, functions ≥45%, lines ≥50%

### 最终目标（1年内）
- **前端**: ≥80%（行业最佳实践）
- **后端**: ≥75%（行业最佳实践）

## 🚀 如何使用

### 本地运行覆盖率

```bash
# 前端覆盖率
pnpm test:frontend:coverage
open coverage/index.html

# 后端覆盖率
pnpm test:backend:coverage
open backend/coverage/index.html

# 一键检查（推荐）
pnpm coverage
```

### CI 中的覆盖率

覆盖率会在每次 PR 和 push 到 release 分支时自动运行：
1. 测试执行时生成覆盖率报告
2. 报告上传为 GitHub Actions artifacts
3. lcov 文件上传到 Codecov（如果配置了 CODECOV_TOKEN）
4. 在 Actions Summary 中显示覆盖率摘要

### Codecov 集成（可选）

如需启用 Codecov 集成：
1. 参阅 `.github/CODECOV_SETUP.md`
2. 在仓库设置中添加 `CODECOV_TOKEN` secret
3. 创建 PR，查看 Codecov bot 的注释

## 📁 生成的文件

### 覆盖率报告
```
coverage/                    # 前端覆盖率报告
├── lcov.info               # LCOV 格式（Codecov 上传）
├── coverage-summary.json   # JSON 摘要（CI 显示）
└── index.html             # HTML 可视化报告

backend/coverage/            # 后端覆盖率报告
├── lcov.info
├── coverage-summary.json
└── index.html
```

## 🔍 排除规则

### 前端排除
- 类型定义（`src/types/**`, `**/*.d.ts`）
- 测试文件（`src/**/*.{test,spec}.{js,ts}`, `tests/**`）
- Mock 数据（`src/**/mocks/**`）
- 入口文件（`src/main.ts`, `src/App.vue`）
- 索引文件（`**/index.ts`）

### 后端排除
- 类型定义（`src/types/**`, `src/**/*.d.ts`）
- 测试文件（`src/**/*.{spec,test}.ts`, `test/**`）
- 入口和服务器（`src/index.ts`, `src/app.ts`, `src/simple-server.ts`）
- 脚本（`src/scripts/**`, `src/seed/**`）
- 配置入口（`src/config/index.ts`）

## ✅ 验收标准

- [x] **配置统一**: 前后端都配置了统一的 include/exclude 和阈值
- [x] **报告生成**: 生成 lcov 和 html 报告
- [x] **CI 集成**: 覆盖率在 CI 中运行并上传
- [x] **PR 可见**: 在 GitHub Actions Summary 显示覆盖率
- [x] **Codecov 支持**: 配置了 Codecov 上传（需要 Token）
- [x] **稳定性**: 使用渐进式阈值，不阻塞现有开发
- [x] **文档完善**: 提供完整的使用和设置文档

## 🎉 亮点

1. **渐进式策略**: 从实际覆盖率出发，避免激进目标阻塞开发
2. **完整文档**: 提供详细的使用指南和设置说明
3. **CI 集成**: 自动生成和上传覆盖率报告
4. **灵活配置**: 支持本地开发和 CI 环境
5. **合理排除**: 避免"假覆盖"和测试膨胀

## 📚 相关文档

- [COVERAGE.md](./COVERAGE.md): 完整使用指南
- [.github/CODECOV_SETUP.md](./.github/CODECOV_SETUP.md): Codecov 设置
- [COVERAGE_IMPLEMENTATION.md](./COVERAGE_IMPLEMENTATION.md): 实施详情

## 🔗 相关链接

- [Vitest Coverage 文档](https://vitest.dev/guide/coverage.html)
- [Jest Coverage 文档](https://jestjs.io/docs/configuration#coveragethreshold-object)
- [Codecov 文档](https://docs.codecov.com/)

## 🙏 致谢

感谢项目团队对测试质量的重视，让我们一起持续改进测试覆盖率！

---

**PR 类型**: Enhancement  
**影响范围**: CI/CD, 测试基础设施  
**Breaking Change**: ❌ 无  
**需要 Review**: ✅ 是
