# 测试覆盖率配置指南

## 📊 覆盖率标准

### 前端覆盖率标准
- **目标阈值**: ≥80% (statements, branches, functions, lines)
- **当前阈值**: statements ≥25%, branches ≥75%, functions ≥50%, lines ≥25%
- **当前覆盖率**: ~26.5% statements, ~77% branches, ~52% functions, ~26.5% lines
- **工具**: Vitest + @vitest/coverage-v8
- **配置文件**: `vitest.config.ts`

### 后端覆盖率标准
- **目标阈值**: ≥75% (statements, branches, functions, lines)
- **当前阈值**: statements ≥50%, branches ≥40%, functions ≥45%, lines ≥50%
- **当前覆盖率**: ~54% statements, ~46% branches, ~50% functions, ~55% lines
- **工具**: Jest + 内置覆盖率
- **配置文件**: `backend/jest.config.ts`

### 覆盖率提升计划
我们采用渐进式提升策略：
1. **第一阶段（当前）**: 建立覆盖率基准线，防止覆盖率下降
2. **第二阶段（3个月内）**: 前端达到 50%，后端达到 60%
3. **第三阶段（6个月内）**: 前端达到 65%，后端达到 70%
4. **最终目标（1年内）**: 前端达到 80%，后端达到 75%

## 🚀 本地运行覆盖率

### 前端覆盖率测试

```bash
# 运行前端测试并生成覆盖率报告
pnpm test:coverage
# 或
pnpm test:frontend:coverage

# 查看 HTML 报告
open coverage/index.html
```

### 后端覆盖率测试

```bash
# 运行后端测试并生成覆盖率报告
pnpm test:backend:coverage

# 查看 HTML 报告
open backend/coverage/index.html
```

## 📁 覆盖率报告文件

### 生成的文件
```
coverage/
├── lcov.info              # LCOV 格式（用于 Codecov）
├── coverage-summary.json  # JSON 摘要
├── coverage-final.json    # 完整 JSON 数据
└── index.html            # HTML 可视化报告

backend/coverage/
├── lcov.info
├── coverage-summary.json
├── coverage-final.json
└── index.html
```

### 文件用途
- **lcov.info**: 上传到 Codecov 等覆盖率服务
- **coverage-summary.json**: CI 中显示覆盖率摘要
- **HTML 报告**: 本地查看详细覆盖率数据
- **JSON 报告**: 供其他工具解析和处理

## 🔍 排除文件说明

### 前端排除规则
以下文件类型不纳入覆盖率统计：

1. **类型定义**: `src/types/**`, `**/*.d.ts`
   - 原因: 纯类型定义，无运行时代码

2. **测试文件**: `src/**/*.{test,spec}.{js,ts}`, `tests/**`
   - 原因: 测试代码本身不需要覆盖

3. **Mock 数据**: `src/**/mocks/**`
   - 原因: 测试辅助代码

4. **入口文件**: `src/main.ts`, `src/App.vue`
   - 原因: 样板代码，难以单元测试

5. **索引文件**: `**/index.ts`
   - 原因: 仅作为导出，无业务逻辑

### 后端排除规则
以下文件类型不纳入覆盖率统计：

1. **类型定义**: `src/types/**`, `src/**/*.d.ts`
   - 原因: 纯类型定义，无运行时代码

2. **测试文件**: `src/**/*.{test,spec}.ts`, `test/**`
   - 原因: 测试代码本身不需要覆盖

3. **入口和服务器**: `src/index.ts`, `src/app.ts`, `src/simple-server.ts`
   - 原因: 样板代码和启动代码

4. **脚本**: `src/scripts/**`, `src/seed/**`
   - 原因: 工具脚本，不是核心业务逻辑

5. **配置入口**: `src/config/index.ts`
   - 原因: 配置导出文件，逻辑在子模块中测试

## 🎯 CI/CD 集成

### GitHub Actions 工作流
- **前端测试**: `.github/workflows/CI.yml` - `frontend-test` job
- **后端测试**: `.github/workflows/CI.yml` - `backend-test` job

### 覆盖率上传
1. **Artifacts**: 所有覆盖率报告都上传为 GitHub Actions artifacts
2. **Codecov**: LCOV 文件自动上传到 Codecov（需要 `CODECOV_TOKEN`）

### 覆盖率摘要
- CI 运行后，在 GitHub Actions Summary 页面查看覆盖率摘要
- Codecov PR 注释显示覆盖率变化

## 📈 Codecov 集成

### 配置文件
- **codecov.yml**: Codecov 配置，定义阈值和注释格式

### 设置 Codecov Token
```bash
# 在 GitHub 仓库设置中添加 Secret
# Settings > Secrets and variables > Actions > New repository secret
# Name: CODECOV_TOKEN
# Value: <your-codecov-token>
```

### 查看覆盖率报告
1. 访问 [Codecov Dashboard](https://app.codecov.io/)
2. 找到你的仓库
3. 查看覆盖率趋势和详细报告

## 🛠️ 故障排查

### 覆盖率波动
如果覆盖率出现波动：

1. **日期相关代码**: 使用固定时间或依赖注入
   ```typescript
   // ❌ 不稳定
   const now = new Date();
   
   // ✅ 稳定
   const now = dateUtils.fixedTestDate();
   ```

2. **随机数据**: 使用固定种子
   ```typescript
   // ❌ 不稳定
   const id = Math.random().toString();
   
   // ✅ 稳定
   const id = 'test-id-' + index;
   ```

3. **异步竞争**: 使用 `await` 确保顺序
   ```typescript
   // ❌ 可能不稳定
   promise1();
   promise2();
   
   // ✅ 稳定
   await promise1();
   await promise2();
   ```

### 覆盖率未达标
如果覆盖率低于阈值：

1. **检查未覆盖代码**:
   ```bash
   # 查看 HTML 报告，红色部分为未覆盖
   open coverage/index.html
   ```

2. **添加测试**:
   - 为未覆盖的函数添加单元测试
   - 为未覆盖的分支添加边界条件测试

3. **合理忽略**:
   对于难以测试的代码，添加注释说明：
   ```typescript
   /* istanbul ignore next */
   if (process.env.NODE_ENV === 'production') {
     // 生产环境特殊逻辑，难以在测试中覆盖
   }
   ```

### CI 覆盖率上传失败
1. **检查 CODECOV_TOKEN**: 确保 Secret 已正确设置
2. **检查文件路径**: 确保 lcov.info 文件生成在正确位置
3. **查看 Action 日志**: 检查 Codecov 上传步骤的详细日志

## 📝 最佳实践

### 1. 编写可测试代码
- 使用依赖注入，避免硬编码
- 将复杂逻辑拆分为小函数
- 避免全局状态

### 2. 测试驱动开发 (TDD)
- 先写测试，再写实现
- 保持测试简单和专注
- 一个测试只测一个行为

### 3. 持续监控
- 每次 PR 都查看覆盖率变化
- 不允许覆盖率下降超过 5%
- 定期审查低覆盖率模块

### 4. 合理目标
- 100% 覆盖率不现实，也不必要
- 关注关键业务逻辑的覆盖率
- 配置文件、类型定义等可以排除

## 🔗 相关资源

- [Vitest Coverage 文档](https://vitest.dev/guide/coverage.html)
- [Jest Coverage 文档](https://jestjs.io/docs/configuration#coveragethreshold-object)
- [Codecov 文档](https://docs.codecov.com/)
- [Istanbul 忽略注释](https://github.com/istanbuljs/nyc#excluding-files)

## 📞 支持

如有问题，请联系开发团队或查阅项目 Wiki。
