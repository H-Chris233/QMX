# E2E核心流程测试文档

## 概述

本项目包含完整的端到端(E2E)测试套件，专门针对QMX学生管理系统的核心业务流程。测试基于Playwright框架，使用Page Object模式提高可维护性，确保关键业务路径无回归。

## 🎯 测试覆盖范围

### 1. 学员管理 (`student-management-core.spec.ts`)
- ✅ 新建学员（含会员起止日期/剩余课时）
- ✅ 编辑与删除学员信息
- ✅ 列表分页与筛选功能
  - `has_membership` 会员状态筛选
  - `membership_active_at` 会员激活时间筛选
  - `membership_status` 会员详细状态筛选
- ✅ 搜索功能（姓名、电话、科目等）

### 2. 现金交易 (`financial-transactions.spec.ts`)
- ✅ 创建交易记录
- ✅ 金额单位转换验证（前端元，后端分）
- ✅ 交易列表查询与筛选
- ✅ 财务统计数据一致性验证

### 3. 分期计划 (`installment-management.spec.ts`)
- ✅ 创建分期计划与期次
- ✅ 更新一期状态
- ✅ 校验统计口径同步
- ✅ 分期付款数据跨端点一致性验证

### 4. 统计仪表盘 (`dashboard-stats.spec.ts`)
- ✅ 加载 dashboard/student/financial 统计
- ✅ 校验环比或汇总字段与后端一致
- ✅ 会员过期提醒功能验证
- ✅ 数据加载性能和格式验证

### 5. CSV导出 (`csv-export.spec.ts`)
- ✅ 在筛选结果下导出CSV
- ✅ 校验文件内容（通过拦截下载）
- ✅ CSV格式规范验证
- ✅ 空数据和搜索结果导出验证

### 6. 集成测试 (`integration.spec.ts`)
- ✅ 跨模块数据一致性验证
- ✅ 学员-财务-仪表盘数据同步
- ✅ 多页面导航状态保持
- ✅ 错误恢复和重试机制

## 🏗️ 架构设计

### Page Object模式
```
tests/e2e/
├── page-objects/          # 页面对象模型
│   ├── AppPage.ts         # 主应用页面
│   ├── StudentManagementPage.ts  # 学员管理页面
│   ├── FinancialStatisticsPage.ts # 财务统计页面
│   └── DashboardPage.ts   # 仪表盘页面
├── features/              # 功能测试用例
├── utils/                 # 测试工具类
│   └── test-utils.ts      # 通用测试工具
├── fixtures.ts           # 测试数据和环境
├── global-setup.ts       # 全局测试设置
└── global-teardown.ts    # 全局测试清理
```

### data-testid策略
为避免选择器脆弱性，所有关键元素都添加了`data-testid`属性：

```vue
<!-- 导航 -->
<div data-testid="nav-students">学员管理</div>
<div data-testid="nav-finance">收支统计</div>
<div data-testid="nav-dashboard">仪表盘</div>

<!-- 学员管理 -->
<input data-testid="student-search-input" />
<button data-testid="add-student-btn" />
<div data-testid="student-list">
  <div data-testid="student-card-1">学员卡片</div>
</div>
<div data-testid="student-pagination">分页</div>

<!-- 财务统计 -->
<div data-testid="total-income">总收入</div>
<div data-testid="total-expense">总支出</div>
<div data-testid="net-profit">净收益</div>

<!-- 仪表盘 -->
<div data-testid="total-revenue">总收入</div>
<div data-testid="active-students">活跃学员</div>
<div data-testid="average-grade">平均成绩</div>
```

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
npm run e2e:install  # 安装Playwright浏览器
```

### 2. 启动服务
```bash
# 启动前后端服务（测试脚本会自动启动）
npm run dev:full
```

### 3. 运行核心流程测试
```bash
# 运行所有核心流程测试
npm run e2e:core

# 显示浏览器界面运行
npm run e2e:core:headed

# 生成HTML报告
npm run e2e:core:report

# 仅在Chrome中运行
npm run e2e:core:chrome

# 仅在Firefox中运行
npm run e2e:core:firefox

# 仅在Safari中运行
npm run e2e:core:safari
```

## 📋 高级用法

### 自定义测试运行
```bash
# 运行特定测试文件
npx playwright test tests/e2e/features/student-management-core.spec.ts --config=playwright.core.config.ts

# 运行匹配的测试
npx playwright test --grep "学员管理" --config=playwright.core.config.ts

# 显示浏览器界面并调试
npx playwright test --debug --headed --config=playwright.core.config.ts

# 更新截图
npx playwright test --update-snapshots --config=playwright.core.config.ts
```

### 使用测试脚本
```bash
# 查看帮助
node scripts/run-e2e-core.js --help

# 运行特定浏览器
node scripts/run-e2e-core.js --browser chromium --headed

# 运行特定测试
node scripts/run-e2e-core.js --grep "CSV导出"

# 运行特定项目
node scripts/run-e2e-core.js --project mobile-chrome-core
```

## 🔧 配置说明

### 核心流程配置 (`playwright.core.config.ts`)
- **超时设置**: 60秒测试超时，30秒操作超时
- **自动服务启动**: 自动启动前后端服务
- **多浏览器支持**: Chrome、Firefox、Safari、移动端
- **失败捕获**: 自动截图、录制视频、保存追踪
- **报告生成**: HTML、JSON、JUnit格式报告

### 环境变量
```bash
# 基础URL（默认: http://localhost:1420）
BASE_URL=http://localhost:1420

# API基础URL（默认: http://localhost:3001/api/v1）
VITE_API_BASE_URL=http://localhost:3001/api/v1

# PostgreSQL 数据库连接（必须配置）
# 格式: postgresql://username:password@host:port/database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/qmx_test

# CI环境
CI=true

# 测试环境
NODE_ENV=test
TEST_DATA_CLEANUP=true
```

## 📊 测试报告

### 报告类型
1. **HTML报告** - 交互式报告，包含截图和视频
2. **JSON报告** - 机器可读的测试结果
3. **JUnit报告** - CI/CD集成格式
4. **控制台报告** - 实时测试输出

### 查看报告
```bash
# 生成并查看HTML报告
npm run e2e:core:report

# 或手动查看
npx playwright show-report
```

### 报告内容
- 📸 失败截图
- 🎥 测试视频
- 🔍 详细追踪
- 📈 性能指标
- 📝 错误日志

## 🛠️ 开发指南

### 添加新的测试用例

1. **创建页面对象**（如果需要新页面）:
```typescript
// tests/e2e/page-objects/NewPage.ts
export class NewPage {
  constructor(public readonly page: Page) {}
  
  async waitForPageLoad(): Promise<void> {
    await this.page.locator('[data-testid="new-page"]').waitFor();
  }
  
  async performAction(): Promise<void> {
    await this.page.locator('[data-testid="action-button"]').click();
  }
}
```

2. **编写测试用例**:
```typescript
// tests/e2e/features/new-feature.spec.ts
import { test, expect } from '../fixtures';
import { NewPage } from '../page-objects/NewPage';

test.describe('新功能测试', () => {
  let newPage: NewPage;
  
  test.beforeEach(async ({ page }) => {
    newPage = new NewPage(page);
    await page.goto('/');
    await newPage.waitForPageLoad();
  });
  
  test('核心功能验证', async () => {
    await newPage.performAction();
    // 添加断言
    expect(true).toBeTruthy();
  });
});
```

3. **添加data-testid**:
```vue
<template>
  <div data-testid="new-page">
    <button data-testid="action-button">操作</button>
  </div>
</template>
```

### 最佳实践

1. **使用Page Object模式**
   - 封装页面操作逻辑
   - 提高测试可维护性
   - 减少重复代码

2. **使用data-testid**
   - 避免CSS选择器脆弱性
   - 提高测试稳定性
   - 便于重构维护

3. **合理使用等待**
   - 优先使用`waitForSelector`
   - 避免固定`waitForTimeout`
   - 使用`waitForNetworkIdle`

4. **错误处理**
   - 验证错误提示显示
   - 测试错误恢复机制
   - 提供有意义的错误信息

5. **数据验证**
   - 验证前端显示格式
   - 对比后端API数据
   - 检查数据一致性

## 🐛 故障排除

### 常见问题

1. **服务启动失败**
   ```bash
   # 检查端口占用
   lsof -i :1420  # 前端端口
   lsof -i :3001  # 后端端口
   
   # 手动启动服务
   npm run dev:full
   ```

2. **浏览器安装问题**
   ```bash
   # 重新安装浏览器
   npx playwright install
   
   # 安装特定浏览器
   npx playwright install chromium
   ```

3. **测试超时**
   - 检查网络连接
   - 验证API响应速度
   - 调整超时配置

4. **元素定位失败**
   - 确认data-testid存在
   - 检查元素是否可见
   - 验证页面加载完成

### 调试技巧

1. **显示浏览器界面**:
   ```bash
   npm run e2e:core:headed
   ```

2. **调试模式**:
   ```bash
   npx playwright test --debug --config=playwright.core.config.ts
   ```

3. **生成追踪**:
   ```typescript
   // 在测试中添加
   await page.pause();
   await page.locator('selector').click();
   ```

4. **查看网络请求**:
   ```bash
   # 在调试模式下打开开发者工具
   # 查看Network标签页
   ```

## 📈 持续集成

### GitHub Actions配置
测试已配置为在CI环境中自动运行：

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run e2e:install
      - run: npm run e2e:core
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### CI配置要点
- 使用无头模式运行
- 自动上传测试报告
- 失败时保存截图和视频
- 并行执行提高效率

## 📚 参考资料

- [Playwright官方文档](https://playwright.dev/)
- [Page Object模式指南](https://martinfowler.com/bliki/PageObject.html)
- [E2E测试最佳实践](https://kentcdodds.com/blog/write-tests)
- [测试金字塔理论](https://martinfowler.com/bliki/TestPyramid.html)

---

**维护者**: H-Chris233  
**最后更新**: 2025-01-09
**版本**: 1.0.0