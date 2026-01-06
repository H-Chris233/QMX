# QMX - 启明星学生管理系统

现代化的教育培训机构学生管理系统，采用前后端分离架构，支持学员管理、成绩管理、财务管理、分期付款、会员管理等全方位功能。

## 🚀 技术栈

### 前端

- **Vue 3** - 现代化前端框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 快速构建工具
- **Axios** - HTTP 客户端

### 后端

- **Node.js** - 运行时环境
- **TypeScript** - 类型安全的 JavaScript
- **Express.js** - Web 应用框架
- **Mongoose** - MongoDB ODM
- **MongoDB** - NoSQL 数据库

## 📦 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm 或 pnpm

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install
```

### 启动开发环境

#### 方式一：同时启动前后端（推荐）

```bash
npm run dev:full
```

#### 方式二：分别启动

```bash
# 启动后端服务（端口3001）
npm run backend

# 启动前端服务（端口1420）
npm run dev
```

### 访问应用

- 前端应用：http://localhost:1420
- 后端 API：http://localhost:3001
- API 文档：http://localhost:3001/api/v1
- 健康检查：http://localhost:3001/health

## 🏗️ 项目结构

```
QMX/
├── frontend (src/)           # 前端Vue应用
│   ├── api/                 # API服务层
│   ├── components/          # Vue组件
│   ├── types/               # TypeScript类型定义
│   ├── utils/               # 工具函数
│   └── main.ts              # 应用入口
├── backend/                 # 后端Express应用
│   ├── src/
│   │   ├── config/          # 配置文件
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由定义
│   │   ├── types/           # 类型定义
│   │   ├── utils/           # 工具函数
│   │   └── index.ts         # 服务入口
│   ├── data/                # 数据库文件
│   ├── logs/                # 日志文件
│   └── uploads/             # 上传文件
└── src-tauri/              # 旧版Tauri代码（已废弃）
```

## 📚 API 文档

### 基础信息

- **基础 URL**: `http://localhost:3001/api/v1`
- **数据格式**: JSON
- **认证方式**: 暂无（本地使用）
- **速率限制**: 所有 API 端点均启用速率限制（30 请求/分钟）

### API 根端点

- `GET /` - API 版本信息和端点列表
- `GET /health` - 健康检查

---

### 学员管理 (Students)

#### 基础 CRUD

- `GET /students` - 获取学员列表（支持分页和高级搜索）
  - **查询参数**: `page`, `limit`, `sort_by`, `sort_order`, `name_contains`, `min_age`, `max_age`, `min_score`, `max_score`, `class_type`, `subject`, `has_membership`, `membership_active_at`
- `POST /students` - 创建学员
- `GET /students/:id` - 获取学员详情
- `PUT /students/:id` - 更新学员信息
- `DELETE /students/:id` - 删除学员

#### 搜索功能

- `GET /students/search` - 高级搜索学员
  - **查询参数**: 与 `GET /students` 相同

---

### 成绩管理 (Scores)

#### 基础操作

- `POST /students/:id/scores` - 为学员添加单个成绩
  - **请求体**: `{ "score": 9.5 }`
- `GET /students/:id/scores` - 获取学员成绩列表
- `PUT /students/:id/scores/:scoreIndex` - 更新学员指定索引的成绩
  - **请求体**: `{ "newScore": 9.8 }`
- `DELETE /students/:id/scores/:scoreIndex` - 删除学员指定索引的成绩

#### 批量操作

- `POST /students/:id/scores/batch` - 批量为学员添加成绩
  - **请求体**: `{ "scores": [9.5, 8.7, 9.2] }`
- `DELETE /students/:id/scores` - 清空学员所有成绩

---

### 财务管理 (Transactions)

#### 基础 CRUD

- `GET /transactions` - 获取交易记录（支持分页和筛选）
  - **查询参数**: `page`, `limit`, `sort_by`, `sort_order`, `student_id`, `min_amount`, `max_amount`, `has_installment`, `date_from`, `date_to`
- `GET /transactions/:id` - 获取交易详情
- `POST /transactions` - 创建普通交易记录（现金交易）
  - **请求体**: `{ "student_id": 1, "amount": 500, "note": "学费" }`
- `DELETE /transactions/:id` - 删除交易记录

#### 搜索功能

- `GET /transactions/search` - 搜索交易记录
  - **查询参数**: 与 `GET /transactions` 相同

#### 分期付款

- `POST /transactions/installment` - 创建分期付款交易
  - **请求体**:
    ```json
    {
      "student_id": 1,
      "total_amount": 5000,
      "note": "年费分期",
      "total_installments": 12,
      "frequency": "monthly",
      "due_date": "2024-02-01",
      "current_installment": 1
    }
    ```

---

### 会员管理 (Membership)

#### 会员统计

- `GET /membership/stats` - 获取会员统计信息
  - **返回**: `{ total_members, active_members, expired_members, expiring_soon, upcoming_members }`

#### 个人会员操作

- `POST /membership/students/:id/membership` - 设置学员会员信息
  - **请求体**: `{ "startDate": "2024-01-01", "endDate": "2024-12-31" }`
- `POST /membership/students/:id/membership/type` - 按类型设置会员（月卡/年卡）
  - **请求体**: `{ "membershipType": "month|year", "startFromToday": true }`
- `POST /membership/students/:id/membership/renew` - 续费会员
  - **请求体**: `{ "membershipType": "month|year", "extendFromCurrent": true }`
- `DELETE /membership/students/:id/membership` - 清除学员会员信息

#### 批量操作

- `POST /membership/batch` - 批量设置会员
  - **请求体**:
    ```json
    {
      "studentIds": [1, 2, 3],
      "membershipType": "month",
      "startFromToday": true
    }
    ```

---

### 统计数据 (Dashboard / Stats)

#### 仪表板统计

- `GET /dashboard/stats` - 获取仪表板统计数据
  - **别名**: `GET /stats/dashboard`
- `GET /dashboard/financial-stats` - 获取财务统计（支持周期选择）
  - **别名**: `GET /stats/financial`
  - **查询参数**: `period` (Today, ThisWeek, ThisMonth, ThisYear)
- `GET /dashboard/global-student-stats` - 获取全局学员统计
- `GET /dashboard/global-financial-stats` - 获取全局财务统计
- `GET /dashboard/membership-expiring` - 获取即将到期的会员
  - **查询参数**: `days` (默认 30 天)

#### 学员个人统计

- `GET /dashboard/students/:id/stats` - 获取特定学员的统计信息
  - **别名**: `GET /stats/student/:id`

---

### 其他端点

#### 健康检查

- `GET /health` - 服务健康状态检查

#### 数据库适配器

- `/adapter/*` - 数据库适配器路由（内部使用）

#### 测试路由

- `/test/*` - 测试路由（仅测试环境可用）

---

## 🛠️ 开发指南

### 添加新的 API 端点

1. **后端实现**：

   - 在 `models/` 中定义数据模型
   - 在 `controllers/` 中实现业务逻辑
   - 在 `routes/` 中定义路由
   - 添加验证规则

2. **前端调用**：
   - 在 `types/api.ts` 中定义接口类型
   - 在 `api/ApiService.ts` 中添加 API 调用方法
   - 在组件中使用 API 服务

### 数据库操作

```bash
cd backend
# 数据库初始化
npm run seed
```

### 环境配置

后端环境变量配置（`backend/.env`）：

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/qmx

# 安全配置
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:1420

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## 📊 代码质量与审计

### 硬编码值审计（2024-11-23）

- 🆕 [硬编码值审计总结](./HARDCODED_VALUES_SUMMARY.md) - 全面审计总结报告
- 🆕 [前端硬编码值报告](./FRONTEND_HARDCODED_VALUES.md) - 前端 47 处硬编码详细分析
- 🆕 [后端硬编码值报告](./BACKEND_HARDCODED_VALUES.md) - 后端 52 处硬编码详细分析

**审计发现**：

- 总共发现 **99 处** 硬编码问题
- Critical 级别: 8 处（需立即处理）
- High 级别: 27 处
- 包含完整的改进方案和实施路线图

## 🎯 主要功能

### 学员管理

- ✅ 学员信息 CRUD 操作
- ✅ 成绩录入和管理
- ✅ 班级和科目管理
- ✅ 高级搜索功能

### 财务管理

- ✅ 收入支出记录
- ✅ 分期付款管理
- ✅ 财务统计报表
- ✅ 交易记录查询

### 会员管理

- ✅ 会员期限设置
- ✅ 会员状态跟踪
- ✅ 到期提醒功能
- ✅ 批量会员操作

### 数据统计

- ✅ 仪表板统计
- ✅ 财务分析
- ✅ 学员表现统计
- ✅ 会员数据分析

## 🔧 构建和部署

### 开发环境

```bash
npm run dev:full    # 同时启动前后端
```

### 生产构建

```bash
# 构建前端
npm run build

# 构建后端
cd backend
npm run build

# 启动生产服务
npm start
```

## 📋 更新日志

### v2.0.0 - 前后端分离版本 (2025-01-02)

- ✨ **重大更新**: 从 Tauri 桌面应用重构为前后端分离的 Web 应用
- ✨ **新增**: RESTful API 后端服务
- ✨ **新增**: 完整的 TypeScript 类型系统
- ✨ **新增**: 数据库 ORM 支持
- ✨ **新增**: API 代理配置
- 🐛 **修复**: 移除 Tauri 依赖
- 🐛 **修复**: 优化数据传输格式

### v1.0.0 - Tauri 桌面版本

- ✨ 初始版本
- ✨ 基础学员管理功能
- ✨ 财务管理功能
- ✨ 会员管理功能

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- Vue.js 团队提供优秀的前端框架
- Express.js 团队提供强大的后端框架
- MongoDB 团队提供强大的数据库解决方案

---

**QMX 学生管理系统** - 让教育管理更简单高效！
