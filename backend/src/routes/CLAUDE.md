[根目录](../../../CLAUDE.md) > [backend](../../) > [src](../) > **routes**

# 后端路由模块

## 变更记录 (Changelog)

### 2025-11-06T06:48:29+0000
- 初始化模块文档
- 记录路由架构和API端点定义

---

## 模块职责

Express路由定义，API端点映射和请求分发。确保RESTful API设计原则和统一的路由结构。

**核心价值**：
- RESTful设计，语义化URL
- 统一的响应格式
- 中间件集成，安全验证
- 模块化路由，便于维护

## 入口与启动

**主入口**：`index.ts` - 路由总入口，整合所有子路由

**路由模块结构**：
```
routes/
├── index.ts              # 路由总入口
├── studentRoutes.ts      # 学员管理路由
├── scoreRoutes.ts        # 成绩管理路由
├── cashRoutes.ts         # 交易管理路由
├── installmentRoutes.ts  # 分期付款路由
├── membershipRoutes.ts   # 会员管理路由
├── statsRoutes.ts        # 统计数据路由
└── adapterRoutes.ts      # 数据库适配器路由
```

## 对外接口

### 核心路由定义

**index.ts** - 路由总入口
```typescript
// API版本信息端点
GET /api/v1/              # API信息

// 路由挂载
/api/v1/students          # 学员管理
/api/v1/scores            # 成绩管理（嵌套在students下）
/api/v1/transactions      # 交易管理
/api/v1/installments      # 分期付款
/api/v1/membership        # 会员管理
/api/v1/dashboard         # 统计数据
/api/v1/adapter           # 数据库适配器
```

**studentRoutes.ts** - 学员管理路由
```typescript
GET    /students              # 获取学员列表（支持分页、搜索）
GET    /students/:uid         # 获取单个学员信息
POST   /students              # 创建新学员
PUT    /students/:uid         # 更新学员信息
DELETE /students/:uid         # 删除学员
GET    /students/:uid/scores  # 获取学员成绩
```

**cashRoutes.ts** - 交易管理路由
```typescript
GET    /transactions          # 获取交易列表
GET    /transactions/:uid     # 获取单个交易
POST   /transactions          # 创建交易
PUT    /transactions/:uid     # 更新交易
DELETE /transactions/:uid     # 删除交易
GET    /transactions/search   # 搜索交易
```

**installmentRoutes.ts** - 分期付款路由
```typescript
GET    /installments          # 获取分期列表
GET    /installments/:id      # 获取分期详情
POST   /installments          # 创建分期计划
PUT    /installments/:id/pay  # 支付分期
DELETE /installments/:id      # 取消分期计划
```

**statsRoutes.ts** - 统计数据路由
```typescript
GET    /dashboard             # 仪表盘统计
GET    /dashboard/students    # 学员统计
GET    /dashboard/financial   # 财务统计
GET    /dashboard/membership  # 会员统计
```

## 关键依赖与配置

### Express中间件
- **express.json()**: 请求体解析
- **cors**: 跨域处理
- **helmet**: 安全头部
- **compression**: 响应压缩
- **rateLimiter**: 速率限制
- **validation**: 数据验证
- **errorHandler**: 错误处理

### 路由配置
```typescript
// 统一响应格式
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页查询参数
interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}
```

### 安全配置
- **JWT验证**: 受保护路由需要token
- **输入验证**: Joi schema验证
- **速率限制**: 防止API滥用
- **CORS配置**: 指定允许的源

## 路由设计原则

### RESTful设计
```typescript
// 资源命名规范
GET    /students           # 获取资源列表
GET    /students/:id       # 获取单个资源
POST   /students           # 创建资源
PUT    /students/:id       # 更新资源
DELETE /students/:id       # 删除资源

// 嵌套资源
GET    /students/:id/scores     # 学员的成绩
POST   /students/:id/scores     # 为学员添加成绩
```

### 响应格式标准
```typescript
// 成功响应
{
  "success": true,
  "data": { /* 实际数据 */ }
}

// 分页响应
{
  "success": true,
  "data": [ /* 数据列表 */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// 错误响应
{
  "success": false,
  "error": "错误信息",
  "message": "详细描述（可选）"
}
```

## 测试与质量

### 测试覆盖
- **集成测试**: 所有API端点
- **测试文件**: `__tests__/api/*.spec.ts`
- **测试工具**: Jest + Supertest

### 代码质量
- TypeScript严格模式
- 统一的错误处理
- 输入验证和清理
- API文档自动生成

### 性能优化
- 数据库查询优化
- 响应缓存
- 分页限制
- 索引使用

## 常见问题 (FAQ)

**Q: 如何添加新的API端点？**
A:
1. 在对应的路由文件中添加路由定义
2. 创建相应的控制器方法
3. 添加验证规则
4. 编写集成测试
5. 更新API文档

**Q: 如何处理认证？**
A:
1. 使用JWT中间件保护路由
2. 在路由前添加认证中间件
3. 检查token有效性
4. 处理权限验证

**Q: 路由参数验证失败？**
A:
1. 检查Joi验证规则
2. 确认参数类型和格式
3. 查看验证错误信息
4. 调整验证schema

**Q: 如何处理大文件上传？**
A:
1. 配置multer中间件
2. 设置文件大小限制
3. 添加文件类型验证
4. 处理上传进度

## 中间件配置示例

### 验证中间件
```typescript
import { validateRequest } from '@/middleware/validation';

// 路由中使用验证
router.post('/students',
  validateRequest(studentSchema),  // 验证请求体
  studentController.createStudent  // 控制器方法
);
```

### 认证中间件
```typescript
import { authenticateToken } from '@/middleware/auth';

// 保护路由
router.use('/protected', authenticateToken);
```

### 速率限制
```typescript
import { rateLimitMiddleware } from '@/middleware/rateLimiter';

// 应用速率限制
router.use(rateLimitMiddleware);
```

## 相关文件清单

```
backend/src/routes/
├── index.ts                # 路由总入口
├── studentRoutes.ts        # 学员管理路由
├── scoreRoutes.ts          # 成绩管理路由
├── cashRoutes.ts           # 交易管理路由
├── installmentRoutes.ts    # 分期付款路由
├── membershipRoutes.ts     # 会员管理路由
├── statsRoutes.ts          # 统计数据路由
└── adapterRoutes.ts        # 数据库适配器路由
```

## 路由架构图

```
┌─────────────────────────────────────────┐
│           Express App                   │
│              (app.ts)                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Router Index                  │
│            (index.ts)                   │
│  ┌───────────────────────────────────┐  │
│  │  API Info (GET /)                 │  │
│  │  Route Mounting                   │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌──────────┐      ┌──────────┐
│Student   │      │Transaction│
│Routes    │      │   Routes  │
│(CRUD +   │      │(CRUD +   │
│Scores)   │      │Search)   │
└────┬─────┘      └────┬─────┘
     │                 │
     └────────┬────────┘
              ▼
     ┌─────────────────┐
     │  Controllers    │
     │  (Business Logic)│
     └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │   Models        │
     │ (Data Access)   │
     └─────────────────┘
```

---

**最后更新**: 2025-11-06T06:48:29+0000