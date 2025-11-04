# QMX Backend

QMX学生管理系统的后端服务，提供完整的RESTful API支持。

## 技术栈

- **Node.js** + **TypeScript** - 运行时和编程语言
- **Express.js** - Web框架
- **Sequelize ORM** - 数据库ORM
- **SQLite/PostgreSQL** - 数据库
- **Joi** - 数据验证
- **Winston** - 日志管理
- **JWT** - 身份认证
- **Helmet/CORS** - 安全中间件

## 快速开始

### 安装依赖

```bash
cd backend
npm install
```

### 环境配置

```bash
cp .env.example .env
# 编辑 .env 文件配置数据库连接等参数
```

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm run build
npm start
```

### 启动流程概览

1. **加载环境变量**：`src/config/index.ts` 会通过 `dotenv` 读取 `.env`，同时调用 `validateConfig()` 校验必填项。
2. **连接数据库**：`src/config/database.ts` 中的 `connectDatabase()` 在应用启动前建立 MongoDB 连接，如连接失败会立即退出。
3. **启动应用**：`src/index.ts` 引导 `app` 实例监听端口，并输出健康检查、环境等启动日志。

> 待相关模型补齐后，可运行 `npm run build` 确认编译通过。

## API文档

### 基础信息

- **基础URL**: `http://localhost:3001/api/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

### 主要端点

#### 学生管理
- `GET /students` - 获取学生列表
- `POST /students` - 创建新学生
- `GET /students/:id` - 获取学生详情
- `PUT /students/:id` - 更新学生信息
- `DELETE /students/:id` - 删除学生

#### 成绩管理
- `POST /students/:id/scores` - 添加成绩
- `GET /students/:id/scores` - 获取学生成绩
- `PUT /students/:id/scores/:index` - 更新成绩
- `DELETE /students/:id/scores/:index` - 删除成绩

#### 财务管理
- `GET /transactions` - 获取交易记录
- `POST /transactions` - 创建交易记录
- `DELETE /transactions/:id` - 删除交易记录

#### 统计数据
- `GET /dashboard/stats` - 获取仪表板统计

## 项目结构

```
backend/
├── src/
│   ├── config/         # 配置文件
│   ├── controllers/    # 控制器
│   ├── middleware/     # 中间件
│   ├── models/         # 数据模型
│   ├── routes/         # 路由定义
│   ├── types/          # TypeScript类型定义
│   ├── utils/          # 工具函数
│   └── index.ts        # 应用入口
├── data/              # 数据库文件
├── logs/              # 日志文件
├── uploads/           # 上传文件
└── dist/              # 编译输出
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3001 |
| NODE_ENV | 运行环境 | development |
| DB_TYPE | 数据库类型 | sqlite |
| DB_NAME | 数据库名称 | qmx_db |
| JWT_SECRET | JWT密钥 | - |
| CORS_ORIGIN | CORS源 | http://localhost:1420 |

## 开发指南

### 添加新的API端点

1. 在`models/`中定义数据模型
2. 在`controllers/`中实现业务逻辑
3. 在`routes/`中定义路由
4. 在`middleware/validation.ts`中添加验证规则

### 数据库迁移

```bash
npm run migrate
```

### 日志管理

日志文件位于`logs/`目录：
- `app.log` - 应用日志
- `app-error.log` - 错误日志
- `app-exceptions.log` - 异常日志

## 许可证

MIT License