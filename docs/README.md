# QMX - 启明星学生管理系统

现代化的教育培训机构学生管理系统，采用前后端分离架构，支持学员管理、成绩管理、财务管理、分期付款、会员管理等全方位功能。

## 🚀 技术栈

### 前端
- **Vue 3** - 现代化前端框架
- **TypeScript** - 类型安全的JavaScript
- **Vite** - 快速构建工具
- **Axios** - HTTP客户端

### 后端
- **Node.js** - 运行时环境
- **TypeScript** - 类型安全的JavaScript
- **Express.js** - Web应用框架
- **Mongoose** - MongoDB ODM
- **MongoDB** - NoSQL数据库

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
- 后端API：http://localhost:3001
- API文档：http://localhost:3001/api/v1
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

## 📚 API文档

### 基础信息
- **基础URL**: `http://localhost:3001/api/v1`
- **数据格式**: JSON
- **认证方式**: 暂无（本地使用）

### 主要端点

#### 学员管理
- `GET /students` - 获取学员列表
- `POST /students` - 创建学员
- `GET /students/:id` - 获取学员详情
- `PUT /students/:id` - 更新学员信息
- `DELETE /students/:id` - 删除学员
- `GET /students/search` - 搜索学员

#### 成绩管理
- `POST /students/:id/scores` - 添加成绩
- `GET /students/:id/scores` - 获取学员成绩
- `PUT /students/:id/scores/:index` - 更新成绩
- `DELETE /students/:id/scores/:index` - 删除成绩

#### 财务管理
- `GET /transactions` - 获取交易记录
- `POST /transactions` - 创建交易记录
- `POST /transactions/installment` - 创建分期付款
- `DELETE /transactions/:id` - 删除交易记录

#### 会员管理
- `POST /membership/students/:id/membership` - 设置会员信息
- `POST /membership/students/:id/membership/type` - 按类型设置会员
- `DELETE /membership/students/:id/membership` - 清除会员信息

#### 统计数据
- `GET /dashboard/stats` - 获取仪表板统计
- `GET /dashboard/financial-stats` - 获取财务统计
- `GET /dashboard/membership-expiring` - 获取即将到期会员

## 🛠️ 开发指南

### 添加新的API端点

1. **后端实现**：
   - 在 `models/` 中定义数据模型
   - 在 `controllers/` 中实现业务逻辑
   - 在 `routes/` 中定义路由
   - 添加验证规则

2. **前端调用**：
   - 在 `types/api.ts` 中定义接口类型
   - 在 `api/ApiService.ts` 中添加API调用方法
   - 在组件中使用API服务

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

## 🎯 主要功能

### 学员管理
- ✅ 学员信息CRUD操作
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
- ✨ **重大更新**: 从Tauri桌面应用重构为前后端分离的Web应用
- ✨ **新增**: RESTful API后端服务
- ✨ **新增**: 完整的TypeScript类型系统
- ✨ **新增**: 数据库ORM支持
- ✨ **新增**: API代理配置
- 🐛 **修复**: 移除Tauri依赖
- 🐛 **修复**: 优化数据传输格式

### v1.0.0 - Tauri桌面版本
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

**QMX学生管理系统** - 让教育管理更简单高效！