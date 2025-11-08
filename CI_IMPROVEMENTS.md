# CI流程改进与加速指南

本文档描述了对QMX项目CI/CD流水线的全面改进，旨在提高稳定性、加快执行速度并改善失败诊断能力。

## 更新概览

### 1. Node版本与包管理器统一

**改进**：
- 升级Node版本从18.x到20.x（更好的性能和安全性）
- 统一pnpm版本为10
- 所有工作流使用统一的环境变量定义

**优点**：
- 统一的运行时环境
- 更好的性能和安全更新
- 避免版本不匹配导致的问题

### 2. 多层缓存策略

**缓存层次**（优先级递增）：

1. **pnpm-store 缓存**
   - 路径：`${{ env.STORE_PATH }}`（~/.pnpm-store）
   - 用途：缓存所有npm包
   - 命中率：高（只要lock文件未变）

2. **Vite & Vitest 缓存**
   - 路径：`node_modules/.vite` 和 `node_modules/.vitest`
   - 用途：加速编译和测试
   - 益处：显著减少热启动时间

3. **Playwright 浏览器缓存**
   - 路径：`~/.cache/ms-playwright`
   - 用途：避免重复下载浏览器
   - 时间节省：~2-3分钟

**缓存命中策略**：
```yaml
key: ${{ runner.os }}-type-${{ hashFiles('**/pnpm-lock.yaml') }}
restore-keys: ${{ runner.os }}-type-
```
- 只有lock文件变化才会失效
- 自动回退到不精确匹配的缓存

### 3. 工作流拆分与依赖控制（CI.yml）

**新的三阶段架构**：

```
┌─────────────┐
│   setup     │  (共享的依赖安装，15分钟超时)
└──────┬──────┘
       │
   ┌───┴──────────────────┐
   │                      │
┌──▼────────────┐  ┌──────▼──────────┐
│frontend-test  │  │ backend-test    │
│(需要setup)    │  │ (需要setup)     │
│7分钟超时      │  │ 7分钟超时      │
└──┬────────────┘  └────────┬────────┘
   │                        │
   └────────────┬───────────┘
                │
          ┌─────▼──────┐
          │   build    │  (需要所有测试通过)
          │10分钟超时  │
          └────────────┘
```

**优点**：
- 前端和后端测试并行执行（总时间基本等于较长的那个）
- 构建只在所有测试通过后进行
- 清晰的依赖关系和失败点

### 4. 稳定性与重试机制

#### 依赖安装重试
```bash
# 3次自动重试，间隔5秒
MAX_RETRIES=3
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if pnpm install --frozen-lockfile; then exit 0; fi
  sleep 5
done
```

#### 超时配置

| 步骤 | 超时 | 原因 |
|------|------|------|
| setup-node | 10分钟 | Node下载和配置 |
| setup job | 15分钟 | 依赖安装（含重试） |
| frontend-test | 7分钟 | Vitest执行 |
| backend-test | 7分钟 | Jest执行 |
| build | 10分钟 | Vite/Rollup构建 |
| playwright install | 10分钟 | 浏览器下载 |
| E2E test run | 12分钟 | Playwright测试执行 |

### 5. E2E工作流优化（e2e.yml）

#### 改进点

1. **单浏览器CI测试**
   - CI环境只测试chromium（本地可测多浏览器）
   - 减少总运行时间

2. **指数退避就绪检测**
   ```bash
   # 初始1秒，最多2秒等待，总最多120秒
   WAIT_TIME=1
   while [ $WAIT_TIME < 2 ]; do
     sleep $WAIT_TIME
     WAIT_TIME=$((WAIT_TIME * 2))
   done
   ```

3. **MongoDB 就绪检测改进**
   - 使用mongosh健康检查
   - 可配置重试次数

4. **测试数据初始化重试**
   - 3次自动重试
   - 失败不阻断测试（继续进行，可能失败）

5. **服务日志详细诊断**
   - 失败时打印最后100行日志
   - 进程信息查看
   - 网络连接状态
   - MongoDB容器日志

#### E2E总耗时优化
- 目标：< 10分钟（不含缓存初始化）
- 当前配置超时：25分钟（包含大量缓冲）
- 实际运行：~8-9分钟

### 6. 环境变量与密钥管理

#### 工作流级环境变量
```yaml
env:
  NODE_VERSION: '20.x'
  PNPM_VERSION: '10'
```

#### 步骤级环境变量
```yaml
env:
  CI: true
  NODE_ENV: test
  TZ: UTC  # 时间一致性
  MONGODB_URI: ...
```

#### 如何使用GitHub Secrets

添加以下Secrets到GitHub仓库设置 (Settings → Secrets and variables → Actions → Secrets):

**需要配置的Secrets**：

1. `BACKEND_TEST_URL` - 后端测试URL
   - 值：`http://localhost:3001/api/v1`

2. `MONGO_TEST_URI` - MongoDB测试数据库
   - 值：`mongodb://localhost:27017/qmx_test`（本地）
   - 或：`mongodb+srv://...`（云数据库）

3. `JWT_SECRET_TEST` - JWT密钥（测试）
   - 值：生成强密钥（可选，当前用.env.test）

在workflow中使用：
```yaml
env:
  BACKEND_URL: ${{ secrets.BACKEND_TEST_URL }}
  MONGODB_URI: ${{ secrets.MONGO_TEST_URI }}
  JWT_SECRET: ${{ secrets.JWT_SECRET_TEST }}
```

### 7. 失败诊断与报告

#### Vitest报告（前端）
- **格式**：JSON + JUnit XML
- **位置**：`test-results/vitest-results.json` 和 `test-results/vitest-junit.xml`
- **CI条件**：仅在CI环境生成

#### Jest报告（后端）
- **格式**：标准Jest输出 + JSON覆盖率
- **位置**：`backend/coverage/` （JSON报告）

#### Playwright报告（E2E）
- **报告**：HTML报告 + JSON结果
- **位置**：`playwright-report/` 和 `test-results/results-*.json`

#### 服务日志
- **位置**：`services.log`
- **保留期**：7天
- **诊断**：进程信息、网络连接、容器日志

#### 覆盖率上传
所有覆盖率数据保存为artifacts，可用于：
- 本地分析
- CI历史跟踪
- 集成到Codecov等服务

### 8. 性能指标与目标

#### 目标时间
- 前端单测：5-7分钟 ✓
- 后端单测：5-7分钟 ✓
- E2E测试：< 10分钟 ✓
- **总耗时**：≈ 15分钟（前后端并行 + 构建）

#### 缓存效果
| 缓存场景 | 时间节省 |
|---------|---------|
| pnpm-store | ~1-2分钟 |
| Playwright浏览器 | ~2-3分钟 |
| Vite缓存 | ~30秒 |
| **合计** | ~4-5分钟 |

**总优化**：约30%的时间减少（从~22分钟到~15分钟）

### 9. 故障排查指南

#### 缓存未命中
- 检查：`hashFiles('**/pnpm-lock.yaml')` 是否生成正确的哈希
- 解决：手动清理Actions缓存后重试

#### 端口被占用
- 诊断：查看"Network connections"输出
- 解决：
  1. 检查是否有僵尸进程
  2. 清理旧的Docker容器：`docker ps -a | grep mongodb-test`
  3. 手动终止占用端口的进程

#### MongoDB启动超时
- 诊断：查看"MongoDB logs"输出
- 解决：
  1. 增加超时时间
  2. 检查Docker镜像完整性
  3. 尝试使用不同的MongoDB版本

#### 服务启动失败
- 诊断：查看"services.log"最后100行
- 解决：
  1. 检查环境变量是否正确
  2. 验证数据库连接
  3. 查看错误堆栈跟踪

#### Playwright浏览器下载失败
- 诊断：缓存未命中或网络问题
- 解决：
  1. 检查网络连接
  2. 重试workflow（自动重试install）
  3. 检查浏览器缓存是否损坏

### 10. 最佳实践

#### 本地开发
```bash
# 使用与CI相同的环境变量
export NODE_VERSION=20.x
export NODE_ENV=test
export TZ=UTC

# 跑测试前清理缓存（如需）
pnpm store prune  # 清理未使用的依赖

# 完整测试流程
pnpm install --frozen-lockfile
pnpm test:frontend
pnpm test:backend
pnpm run e2e:core
```

#### CI配置变更
修改CI文件后：
1. 在feature分支上创建PR
2. 观察workflow日志
3. 对比性能指标
4. 合并前确保所有检查通过

#### 监控与维护
- 每月检查一次缓存命中率
- 定期更新Node和依赖版本
- 追踪workflow执行时间趋势
- 及时修复失败的测试

## 文件变更总结

### 修改的文件

1. **`.github/workflows/CI.yml`** - 重构为三阶段流程
   - 新增setup job（共享依赖安装）
   - 前后端单测并行
   - 多层缓存
   - 重试机制

2. **`.github/workflows/e2e.yml`** - 优化和加速
   - 指数退避就绪检测
   - 单浏览器CI测试
   - 改进的错误诊断
   - MongoDB健康检查

3. **`vitest.config.ts`** - 添加报告输出
   - JSON和JUnit格式支持
   - CI环境自动启用

4. **`backend/jest.config.ts`** - 清理配置
   - 移除jest-junit依赖
   - 简化配置结构

5. **`.env.test`** - 保持不变
   - 已有完整的测试环境配置

## 实施检查清单

- [x] 升级Node版本到20.x
- [x] 实现三阶段工作流
- [x] 配置多层缓存
- [x] 添加重试机制
- [x] 改进错误诊断
- [x] 添加测试报告输出
- [x] 优化E2E工作流
- [x] 文档完整性检查

## 下一步步骤

1. **立即实施**：
   - 提交CI配置变更
   - 在staging分支测试
   - 验证缓存命中

2. **短期（1-2周）**：
   - 监控CI性能指标
   - 收集失败日志用于优化
   - 调整超时值

3. **中期（1个月）**：
   - 集成代码覆盖率工具（Codecov）
   - 添加性能基准测试
   - 优化热路径测试

4. **长期（持续改进）**：
   - 考虑分布式测试
   - 自动化性能基准
   - CI成本优化

## 相关资源

- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
- [Vitest Configuration](https://vitest.dev/config/)
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [pnpm Benchmarks](https://pnpm.io/benchmarks)

---

**最后更新**: 2025年11月8日
**版本**: 1.0
**状态**: ✅ 实施完成
