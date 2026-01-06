# 测试文档

QMX项目的完整测试文档，包含前端、后端和E2E测试的详细指南。

## 📋 文档列表

### 核心文档
- **[前端测试指南](./frontend-testing.md)** ⭐
  - Vitest + Vue Test Utils
  - 组件测试
  - 单元测试
  - 集成测试

- **[后端测试指南](./backend-testing.md)** ⭐
  - Jest + Supertest
  - API测试
  - 服务层测试
  - MongoDB Memory Server

- **[E2E测试指南](./e2e-testing.md)**
  - Playwright
  - 端到端测试
  - 测试策略

## 🚀 快速开始

### 运行测试
```bash
# 前端测试
npm test                # 运行所有测试
npm run test:watch     # 监视模式
npm run test:coverage  # 生成覆盖率

# 后端测试
cd backend
npm test                # 运行所有测试
npm test -- --coverage  # 带覆盖率

# E2E测试
npm run e2e            # 完整E2E测试
npm run e2e:core       # 核心测试
```

## 📊 测试覆盖率

### 当前状态 (v0.12.1)
```
总测试: 175个
✅ 通过: 139个 (79.4%)
❌ 失败: 36个 (20.6%)
```

### 模块覆盖率
| 模块 | 覆盖率 | 状态 | 改进目标 |
|------|--------|------|---------|
| 后端API | 90%+ | ✅ 优秀 | 95%+ |
| 后端服务层 | 90%+ | ✅ 优秀 | 95%+ |
| 前端工具函数 | 80%+ | ✅ 良好 | 85%+ |
| 前端组件 | 30%- | ⚠️ 需改进 | 70%+ |
| E2E | 基础覆盖 | ⚠️ 需改进 | 完整覆盖 |

## 🏗️ 测试架构

### 前端测试栈
```
Vitest (测试框架)
├── @vue/test-utils (Vue组件测试)
├── happy-dom (DOM实现)
└── vitest/config (配置)

Pinia (状态管理测试)
└── 在setup.ts中初始化

MSW (Mock Service Worker)
└── 拦截HTTP请求
```

### 后端测试栈
```
Jest (测试框架)
├── Supertest (HTTP测试)
├── MongoDB Memory Server (内存数据库)
└── Jest配置

测试辅助
├── TestSetup (测试数据构建)
└── Builders (StudentBuilder, CashBuilder)
```

### E2E测试栈
```
Playwright (E2E框架)
├── Chromium浏览器
├── 页面对象模式
└── 视觉回归测试
```

## 📝 测试类型

### 1. 单元测试
测试独立的函数和类。

**位置**:
- 前端: `src/utils/__tests__/`
- 后端: `backend/src/__tests__/`

**示例**:
```typescript
describe('dataTransformers', () => {
  it('should parse number correctly', () => {
    expect(safeParseNumber('123')).toBe(123);
  });
});
```

### 2. 组件测试
测试Vue组件的行为和渲染。

**位置**: `src/components/__tests__/`

**示例**:
```typescript
describe('ErrorModal', () => {
  it('should display error message', () => {
    const wrapper = mountWithPinia(ErrorModal, {
      props: { show: true, message: 'Test error' }
    });
    expect(wrapper.text()).toContain('Test error');
  });
});
```

### 3. API测试
测试后端API端点。

**位置**: `backend/src/__tests__/api/`

**示例**:
```typescript
describe('Students API', () => {
  it('GET /students should return student list', async () => {
    const res = await request(app).get('/api/v1/students');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});
```

### 4. E2E测试
测试完整的用户流程。

**位置**: `tests/e2e/`

**示例**:
```typescript
test('should add new student', async ({ page }) => {
  await page.goto('/');
  await page.click('text=添加学员');
  await page.fill('[name="name"]', '张三');
  await page.click('button:has-text("提交")');
  await expect(page.locator('text=张三')).toBeVisible();
});
```

## 🎯 测试策略

### 优先级
1. **必测** (High Priority)
   - 关键业务逻辑
   - 用户核心流程
   - 数据验证
   - 错误处理

2. **应测** (Medium Priority)
   - UI组件行为
   - API端点
   - 数据转换
   - 边界情况

3. **可测** (Low Priority)
   - 工具函数
   - 辅助方法
   - 配置处理

### 测试金字塔
```
        /\
       /E2E\        10%  (端到端测试)
      /------\
     /集成测试\      20%  (API/组件集成)
    /----------\
   /  单元测试  \    70%  (函数/类单元测试)
  /--------------\
```

## ✅ 最佳实践

### 测试命名
```typescript
// ✅ 好：清晰描述测试内容
it('should return 404 when student not found', () => {});

// ❌ 差：含糊不清
it('test student', () => {});
```

### 测试隔离
```typescript
// ✅ 好：每个测试独立
describe('MyComponent', () => {
  beforeEach(() => {
    // 每个测试前重置
    setActivePinia(createPinia());
  });

  it('test 1', () => {
    const wrapper = mountWithPinia(MyComponent);
    // ...
  });
});
```

### Mock策略
```typescript
// ✅ 好：使用spy跟踪调用
const mockFn = vi.spyOn(ApiService, 'getAllStudents');
mockFn.mockResolvedValue({ students: [] });

// 验证
expect(mockFn).toHaveBeenCalled();
```

### 异步处理
```typescript
// ✅ 好：正确等待异步操作
it('should load data', async () => {
  const wrapper = mountWithPinia(MyComponent);
  await wrapper.vm.$nextTick();
  expect(wrapper.text()).toContain('Loaded');
});
```

## 🔧 故障排查

### 前端测试问题

#### 组件找不到
```
Error: Failed to resolve component
```
**解决**: 检查导入路径，使用`@/components/...`

#### Mock不生效
```
TypeError: Cannot read property 'then' of undefined
```
**解决**: 使用`mockResolvedValue`而不是`mockReturnValue`

#### 测试超时
```
Timeout - Async callback was not invoked
```
**解决**: 添加`async`关键字，增加超时时间

### 后端测试问题

#### 数据库连接失败
```
MongooseError: Connection refused
```
**解决**: 确保MongoDB Memory Server正确启动

#### 端口冲突
```
EADDRINUSE: address already in use
```
**解决**: 使用不同的测试端口或清理残留进程

#### 资源泄漏
```
Jest did not exit one second after the test run
```
**解决**: 确保在`afterAll`中关闭数据库连接

## 📈 改进计划

### 短期目标 (1-2周)
- [ ] 提升前端组件测试覆盖率至60%+
- [ ] 修复剩余36个失败测试
- [ ] 添加更多边界情况测试

### 中期目标 (1个月)
- [ ] 总体测试覆盖率达到85%+
- [ ] 实现完整的E2E测试套件
- [ ] 建立测试性能基准

### 长期目标 (3个月)
- [ ] 测试覆盖率达到90%+
- [ ] 实现视觉回归测试
- [ ] 自动化性能测试

## 📚 相关资源

### 框架文档
- [Vitest](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Jest](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Playwright](https://playwright.dev/)

### 最佳实践
- [JavaScript测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Vue测试指南](https://vuejs.org/guide/scaling-up/testing.html)
- [Node.js测试最佳实践](https://github.com/goldbergyoni/nodebestpractices#6-testing-best-practices)

---

**最后更新**: 2025-01-06
**维护者**: H-Chris233
