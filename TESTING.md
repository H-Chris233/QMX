# QMX 前端测试指南

完整的前端测试基础设施已部署。本指南涵盖了从基础到进阶的测试编写方法。

## 快速开始

### 1. 运行测试

```bash
# 一次性运行所有测试
npm run test

# 监视模式（推荐开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 2. 创建第一个测试

在 `src/components/__tests__/MyComponent.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mountWithPinia } from '../../../tests/helpers/mount';
import MyComponent from '../MyComponent.vue';

describe('MyComponent', () => {
  it('应该正确渲染', () => {
    const wrapper = mountWithPinia(MyComponent);
    expect(wrapper.exists()).toBe(true);
  });
});
```

## 完整测试架构

### 依赖关系

```
vitest (测试框架)
├── @vue/test-utils (Vue组件测试)
├── happy-dom (DOM实现)
└── vitest/config (配置)

pinia (状态管理)
└── 在setup.ts中初始化

msw (Mock Service Worker)
└── 拦截所有HTTP请求

ApiService (API客户端)
└── 在setup.ts中mocked
```

### 文件组织

```
src/
├── components/
│   ├── __tests__/
│   │   ├── ComponentName.spec.ts    # 组件测试
│   │   └── ...
│   └── ComponentName.vue
├── utils/
│   ├── __tests__/
│   │   └── dataTransformers.test.ts # 工具函数测试
│   └── dataTransformers.ts
└── stores/
    └── app.ts

tests/                               # 测试基础设施
├── setup.ts                        # 全局初始化
├── helpers/
│   └── mount.ts                    # 辅助函数
├── mocks/
│   └── msw/
│       └── handlers.ts             # API mock
└── README.md                       # 详细文档
```

## 测试类型

### 1. 组件测试（最常见）

测试Vue组件的行为、事件和状态。

```typescript
import { describe, it, expect } from 'vitest';
import { mountWithPinia } from '../../../tests/helpers/mount';
import ErrorModal from '../ErrorModal.vue';

describe('ErrorModal Component', () => {
  // 测试渲染
  it('应该显示错误信息', () => {
    const wrapper = mountWithPinia(ErrorModal, {
      props: {
        show: true,
        title: '错误',
        message: '测试错误消息',
      },
    });
    
    expect(wrapper.text()).toContain('测试错误消息');
  });

  // 测试事件
  it('应该在点击按钮时触发close事件', async () => {
    const wrapper = mountWithPinia(ErrorModal, {
      props: {
        show: true,
        message: '测试',
      },
    });

    await wrapper.find('.error-btn.primary').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  // 测试条件渲染
  it('当show为false时不应该显示', () => {
    const wrapper = mountWithPinia(ErrorModal, {
      props: {
        show: false,
        message: '测试',
      },
    });

    expect(wrapper.find('.error-modal-overlay').exists()).toBe(false);
  });

  // 测试Props
  it('应该显示retry按钮', () => {
    const wrapper = mountWithPinia(ErrorModal, {
      props: {
        show: true,
        message: '测试',
        showRetry: true,
      },
    });

    expect(wrapper.find('.error-btn.secondary').exists()).toBe(true);
  });
});
```

### 2. 单元测试

测试独立的函数。

```typescript
import { describe, it, expect } from 'vitest';
import { safeParseNumber, formatCurrency } from '@/utils/dataTransformers';

describe('数据转换器', () => {
  describe('safeParseNumber', () => {
    it('应该解析数字', () => {
      expect(safeParseNumber(123.45)).toBe(123.45);
      expect(safeParseNumber('123.45')).toBe(123.45);
    });

    it('应该处理无效输入', () => {
      expect(safeParseNumber('invalid')).toBe(0);
      expect(safeParseNumber(null)).toBe(0);
    });

    it('应该应用范围限制', () => {
      expect(safeParseNumber(150, 0, { min: 0, max: 100 })).toBe(100);
      expect(safeParseNumber(-50, 0, { min: 0, max: 100 })).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('应该格式化为货币', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('¥');
      expect(result).toContain('1,234.56');
    });

    it('应该处理负数', () => {
      const result = formatCurrency(-100);
      expect(result).toContain('-');
    });
  });
});
```

### 3. 集成测试（涉及API）

测试组件与API的交互。

```typescript
import { describe, it, expect, vi } from 'vitest';
import { mountWithPinia } from '../../../tests/helpers/mount';
import StudentManagement from '../StudentManagement.vue';
import { ApiService } from '@/api/ApiService';

describe('StudentManagement Integration', () => {
  it('应该获取并显示学员列表', async () => {
    // Mock API调用
    vi.spyOn(ApiService, 'getAllStudents').mockResolvedValue({
      students: [
        {
          uid: 1,
          name: '张三',
          age: 20,
          phone: '13800138000',
          class: 'Month',
          subject: 'Shooting',
          rings: [8, 9, 7],
          lesson_left: 10,
          membership_start_date: '2024-01-01',
          membership_end_date: '2024-12-31',
          membership_status: 'Active',
          is_membership_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        total_pages: 1,
      },
    });

    const wrapper = mountWithPinia(StudentManagement);
    
    // 等待异步操作完成
    await wrapper.vm.$nextTick();
    
    // 验证
    expect(wrapper.text()).toContain('张三');
  });

  it('应该在API错误时显示错误消息', async () => {
    // Mock API错误
    vi.spyOn(ApiService, 'getAllStudents').mockRejectedValue(
      new Error('网络错误')
    );

    const wrapper = mountWithPinia(StudentManagement);
    await wrapper.vm.$nextTick();

    // 验证错误处理
    expect(wrapper.vm.students).toBeDefined();
  });

  it('应该支持分页', async () => {
    const mockFn = vi.spyOn(ApiService, 'getAllStudents');
    
    const wrapper = mountWithPinia(StudentManagement);
    
    // 模拟点击下一页
    // （具体实现取决于你的组件）
    
    // 验证API是否被正确调用
    expect(mockFn).toHaveBeenCalled();
  });
});
```

### 4. 状态管理测试

测试Pinia store。

```typescript
import { describe, it, expect } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAppStore } from '@/stores/app';

describe('App Store', () => {
  beforeEach(() => {
    // 为每个测试创建新的Pinia实例
    setActivePinia(createPinia());
  });

  it('应该管理加载状态', () => {
    const store = useAppStore();
    
    expect(store.isLoading).toBe(false);
    
    store.setGlobalLoading(true);
    expect(store.isLoading).toBe(true);
    
    store.clearLoading();
    expect(store.isLoading).toBe(false);
  });

  it('应该管理错误', () => {
    const store = useAppStore();
    
    expect(store.hasErrors).toBe(false);
    
    store.addError({
      message: '测试错误',
      context: 'test',
    });
    
    expect(store.hasErrors).toBe(true);
    expect(store.latestError?.message).toBe('测试错误');
    
    store.clearErrors();
    expect(store.hasErrors).toBe(false);
  });

  it('应该显示确认对话框', () => {
    const store = useAppStore();
    
    store.showConfirm({
      title: '确认',
      message: '确定删除吗？',
      onConfirm: () => console.log('confirmed'),
    });
    
    expect(store.confirmModal.show).toBe(true);
    expect(store.confirmModal.title).toBe('确认');
  });
});
```

## 常用的Mock模式

### Mock API

```typescript
import { vi } from 'vitest';
import { ApiService } from '@/api/ApiService';

// 方式1：模拟成功响应
vi.spyOn(ApiService, 'getAllStudents').mockResolvedValue({
  students: [],
  pagination: { /* ... */ }
});

// 方式2：模拟错误
vi.spyOn(ApiService, 'getAllStudents').mockRejectedValue(
  new Error('API error')
);

// 方式3：模拟部分响应
const mockFn = vi.spyOn(ApiService, 'getAllStudents')
  .mockImplementation(async (params) => {
    if (params?.page === 1) {
      return { students: [/* ... */], pagination: { /* ... */ } };
    }
    return { students: [], pagination: { /* ... */ } };
  });

// 验证调用
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith({ page: 1 });
```

### Mock 状态管理

```typescript
import { useAppStore } from '@/stores/app';

const appStore = useAppStore();

// 直接设置状态
appStore.setGlobalLoading(true);

// 验证状态
expect(appStore.isLoading).toBe(true);

// 调用actions
appStore.addError({ message: 'test' });
expect(appStore.hasErrors).toBe(true);
```

### Mock 网络请求（自动）

MSW会自动拦截所有请求，无需配置：

```typescript
// 这会被自动拦截
const response = await fetch('/api/v1/students');
const data = await response.json();
// data 会是 handlers.ts 中定义的mock数据
```

## 异步测试

### 测试异步操作

```typescript
describe('异步操作', () => {
  // 方式1：使用 async/await
  it('应该处理Promise', async () => {
    const result = await ApiService.getAllStudents();
    expect(result.students).toBeInstanceOf(Array);
  });

  // 方式2：使用 resolves
  it('应该使用resolves匹配器', () => {
    return expect(
      ApiService.getAllStudents()
    ).resolves.toHaveProperty('students');
  });

  // 方式3：等待组件更新
  it('应该更新DOM', async () => {
    const wrapper = mountWithPinia(MyComponent);
    
    // 触发异步操作
    await wrapper.find('button').trigger('click');
    
    // 等待Vue更新
    await wrapper.vm.$nextTick();
    
    // 验证
    expect(wrapper.text()).toContain('已加载');
  });
});
```

## 覆盖率和最佳实践

### 覆盖率目标

- **行**: ≥ 80%
- **函数**: ≥ 80%
- **分支**: ≥ 80%
- **语句**: ≥ 80%

### 应该测试什么

✅ **必测**：
- 用户可见的行为（点击、输入、显示）
- 关键业务逻辑
- 错误处理
- 边界情况

❌ **无需测试**：
- Vue框架本身的功能
- 第三方库的功能
- 简单的数据转发

### 最佳实践

1. **测试名称清晰**
   ```typescript
   // ✅ 好
   it('应该在用户点击删除按钮时显示确认对话框', () => {});
   
   // ❌ 差
   it('test delete', () => {});
   ```

2. **一个测试一个断言**
   ```typescript
   // ✅ 好
   it('应该显示错误消息', () => {
     const wrapper = mountWithPinia(MyComponent);
     expect(wrapper.text()).toContain('错误');
   });
   
   // ❌ 差（多个不相关的断言）
   it('应该工作', () => {
     const wrapper = mountWithPinia(MyComponent);
     expect(wrapper.exists()).toBe(true);
     expect(wrapper.text()).toContain('错误');
     expect(wrapper.find('button').exists()).toBe(true);
   });
   ```

3. **使用合适的匹配器**
   ```typescript
   // ✅ 使用 toContain 而不是 includes()
   expect(wrapper.text()).toContain('文本');
   
   // ✅ 使用 toHaveBeenCalled 而不是检查mock
   expect(mockFn).toHaveBeenCalled();
   
   // ✅ 使用 resolves 处理 Promises
   await expect(promise).resolves.toEqual(value);
   ```

4. **隔离测试**
   ```typescript
   // ✅ 每个测试都应该独立运行
   describe('MyComponent', () => {
     it('test 1', () => {
       const wrapper = mountWithPinia(MyComponent);
       // 该wrapper只在此测试中使用
     });
     
     it('test 2', () => {
       const wrapper = mountWithPinia(MyComponent);
       // 这是全新的wrapper，不会受test1影响
     });
   });
   ```

## 故障排除

### 问题：测试找不到组件

```
Error: [Vue warn]: Failed to resolve component
```

**解决**：
1. 确认组件路径正确
2. 检查导入语句
3. 使用绝对路径（`@/components/...`）

### 问题：Mock不生效

```
TypeError: Cannot read property 'then' of undefined
```

**解决**：
1. 确保在 `beforeEach` 中设置mock
2. 使用 `mockResolvedValue` 而不是 `mockReturnValue`
3. 检查mock的方法名称是否正确

### 问题：异步测试超时

```
Timeout - Async callback was not invoked
```

**解决**：
1. 添加 `async` 关键字到测试函数
2. 增加超时时间：`it('test', async () => {}, 10000)`
3. 检查是否有未处理的Promise

### 问题：DOM未更新

```
Expected 'Loading' but got ''
```

**解决**：
1. 添加 `await wrapper.vm.$nextTick()`
2. 确保等待异步操作完成
3. 检查组件是否正确更新了状态

## 进阶主题

### 快照测试

```typescript
it('应该匹配快照', () => {
  const wrapper = mountWithPinia(MyComponent);
  expect(wrapper.html()).toMatchSnapshot();
});

// 运行: npm run test -- -u 更新快照
```

### 性能测试

```typescript
it('应该在性能范围内完成', () => {
  const start = performance.now();
  // 执行操作
  const end = performance.now();
  expect(end - start).toBeLessThan(1000); // 1秒
});
```

### 自定义匹配器

```typescript
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },
});
```

## 配置文件参考

### vitest.config.ts
- 环境：`happy-dom`
- Setup文件：`tests/setup.ts`
- 测试文件模式：`src/**/*.{test,spec}.{js,ts}`

### tests/setup.ts
- Pinia初始化
- ApiService mock
- MSW启动

### tests/helpers/mount.ts
- 自定义mount函数
- Pinia集成
- 常用工具函数

## CI/CD

GitHub Actions自动运行：
- 触发：push/PR到release分支
- 步骤：安装 → 测试 → 构建 → 上传artifacts

查看结果：`.github/workflows/CI.yml`

## 资源链接

- [Vitest官网](https://vitest.dev/)
- [Vue Test Utils文档](https://test-utils.vuejs.org/)
- [MSW文档](https://mswjs.io/)
- [Pinia测试指南](https://pinia.vuejs.org/cookbook/testing.html)
- [项目测试基建详情](./tests/README.md)

## 获取帮助

遇到问题？
1. 查看 `tests/README.md` 详细文档
2. 运行 `npm run test:watch` 交互式调试
3. 检查现有测试用例
4. 查阅官方文档
