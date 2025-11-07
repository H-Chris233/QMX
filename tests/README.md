# QMX 前端测试基建

本目录包含QMX前端项目的完整测试基础设施。

## 目录结构

```
tests/
├── setup.ts                    # 全局测试初始化
├── helpers/
│   └── mount.ts               # Vue组件测试辅助函数
├── mocks/
│   └── msw/
│       ├── handlers.ts        # MSW请求拦截器
│       └── server.ts          # MSW服务器配置（在setup.ts中使用）
└── README.md                  # 本文件
```

## 功能特性

### 1. 全局测试设置 (setup.ts)

- **Pinia状态管理初始化**: 为每个测试自动初始化Pinia
- **ApiService Mock**: 预配置了常用的API方法mock
- **MSW网络拦截**: 使用Mock Service Worker拦截HTTP请求
- **全局测试生命周期**: beforeAll、afterEach、afterAll钩子

### 2. 测试辅助工具 (helpers/mount.ts)

提供了自定义的Vue组件挂载函数，自动配置：

- Pinia状态管理
- 常用providers（路由、i18n等）
- 全局stub规则

```typescript
import { mountWithPinia } from '@/../../tests/helpers/mount';
import MyComponent from '@/components/MyComponent.vue';

describe('MyComponent', () => {
  it('should render', () => {
    const wrapper = mountWithPinia(MyComponent, {
      props: { title: 'Test' },
      slots: { default: 'Content' }
    });
    expect(wrapper.text()).toContain('Content');
  });
});
```

### 3. 网络Mock (mocks/msw)

使用Mock Service Worker (MSW)拦截所有API请求，支持：

- **学员管理**: 获取列表、按ID查询、创建、更新、删除
- **交易管理**: 获取列表、创建交易
- **分期管理**: 获取分期列表
- **统计数据**: 仪表板、学员、财务统计

所有handlers均支持分页、错误响应等常见场景。

## 使用指南

### 运行测试

```bash
# 运行所有测试
npm run test

# 监视模式（开发中使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 编写组件测试

1. **创建测试文件**：在组件同级目录创建 `ComponentName.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { mountWithPinia } from '@/../../tests/helpers/mount';
import MyComponent from '../MyComponent.vue';

describe('MyComponent', () => {
  it('应该正确渲染', () => {
    const wrapper = mountWithPinia(MyComponent);
    expect(wrapper.exists()).toBe(true);
  });

  it('应该触发事件', async () => {
    const wrapper = mountWithPinia(MyComponent);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });
});
```

2. **Mock API调用**：使用预配置的ApiService mock

```typescript
import { vi } from 'vitest';
import { ApiService } from '@/api/ApiService';

it('应该调用ApiService', async () => {
  const mockFn = vi.spyOn(ApiService, 'getAllStudents').mockResolvedValue({
    students: [{ uid: 1, name: '测试学员', /* ... */ }],
    pagination: { /* ... */ }
  });

  // 你的测试代码
  
  expect(mockFn).toHaveBeenCalled();
});
```

3. **Mock状态管理**：Pinia已在setup.ts中初始化

```typescript
import { useAppStore } from '@/stores/app';

it('应该使用appStore', () => {
  const appStore = useAppStore();
  appStore.setGlobalLoading(true);
  expect(appStore.isLoading).toBe(true);
});
```

### 测试网络请求

MSW会自动拦截所有API请求，无需额外配置：

```typescript
it('应该获取学员列表', async () => {
  const students = await ApiService.getAllStudents();
  expect(students.students).toBeDefined();
  expect(students.pagination).toBeDefined();
});
```

## 配置文件

### vitest.config.ts

核心测试配置：
- 环境: `happy-dom` (轻量级DOM实现)
- 全局API: 无需导入即可使用 `describe`、`it` 等
- Setup文件: `tests/setup.ts`
- 测试文件匹配: `src/**/*.{test,spec}.{js,ts}`

### package.json

添加的脚本命令：
```json
{
  "test": "vitest run",        // 运行一次所有测试
  "test:watch": "vitest",      // 监视模式
  "test:coverage": "vitest run" // 生成覆盖率（需要配置v8提供程序）
}
```

## CI/CD 集成

GitHub Actions工作流已配置：

1. **前端测试作业** (`CI.yml` - frontend job)
   - 依赖安装
   - 运行 `npm run test`
   - 构建前端
   - 上传artifacts

2. **运行时刻**: 
   - 推送到 `release` 分支
   - 拉取请求到 `release` 分支

## 最佳实践

### 1. 组件测试

- ✅ 测试用户可见的行为
- ✅ 测试事件发射和道具变化
- ✅ Mock外部依赖（API、路由等）
- ❌ 不要测试Vue的内部实现

### 2. 数据转换测试

对于复杂的数据转换函数，编写单元测试：

```typescript
import { describe, it, expect } from 'vitest';
import { transformData } from '@/utils/dataTransformers';

describe('transformData', () => {
  it('应该正确转换数据', () => {
    const input = { raw_value: 100 };
    const output = transformData(input);
    expect(output.value).toBe(100);
  });

  it('应该处理边界情况', () => {
    expect(transformData(null)).toBeNull();
    expect(transformData({})).toEqual({});
  });
});
```

### 3. Mock管理

- 使用 `vi.spyOn()` 创建mock
- 在 `afterEach` 中自动清除mock
- 每个测试中可覆盖全局mock

```typescript
import { vi } from 'vitest';

it('应该使用自定义mock', () => {
  vi.spyOn(ApiService, 'getStudentById').mockResolvedValue({
    uid: 999,
    name: '自定义学员'
  });
  
  // 测试代码
});
// afterEach中会自动清除mock
```

### 4. 异步测试

```typescript
it('应该处理异步操作', async () => {
  const data = await ApiService.getAllStudents();
  expect(data.students).toBeInstanceOf(Array);
});

it('应该等待DOM更新', async () => {
  const wrapper = mountWithPinia(MyComponent);
  await wrapper.find('input').setValue('test');
  await wrapper.vm.$nextTick();
  expect(wrapper.text()).toContain('test');
});
```

## 故障排除

### 问题1: "Cannot find module '@/...'"

**解决**: 确保 `vitest.config.ts` 中的别名设置正确：
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### 问题2: "getActivePinia() was called but there was no active Pinia"

**解决**: 在测试中使用 `mountWithPinia` 而不是直接的 `mount`，它会自动初始化Pinia。

### 问题3: 网络请求不被拦截

**解决**: 确保MSW服务器已启动。这在 `setup.ts` 的 `beforeAll` 中自动完成。

### 问题4: 测试超时

**解决**: 增加超时时间或检查异步操作：
```typescript
it('should complete', async () => {
  // 测试代码
}, 10000); // 10秒超时
```

## 进阶主题

### 添加新的Mock Handler

编辑 `tests/mocks/msw/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // 添加新的handler
  http.post('/api/v1/new-endpoint', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { success: true, data: { /* ... */ } },
      { status: 200 }
    );
  }),
  // ... 其他handlers
];
```

### 快照测试

```typescript
it('应该匹配快照', () => {
  const wrapper = mountWithPinia(MyComponent);
  expect(wrapper.html()).toMatchSnapshot();
});
```

运行 `npm run test -- -u` 更新快照。

### 性能测试

```typescript
import { performance } from 'node:perf_hooks';

it('应该在性能范围内', () => {
  const start = performance.now();
  expensiveOperation();
  const end = performance.now();
  expect(end - start).toBeLessThan(1000); // 1秒内完成
});
```

## 参考资源

- [Vitest 文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [MSW 文档](https://mswjs.io/)
- [Pinia 测试指南](https://pinia.vuejs.org/cookbook/testing.html)

## 贡献指南

添加新测试时：

1. 遵循现有的目录结构
2. 使用描述性的测试名称
3. 为复杂功能添加注释
4. 确保测试独立且可重复运行
5. 检查测试覆盖率（使用 `npm run test:coverage`）
