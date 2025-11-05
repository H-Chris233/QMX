# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

QMX（启明星）是一个现代化的教育培训机构学生管理系统，采用前后端分离架构。原为Tauri桌面应用，现已重构为Web应用，支持学员管理、成绩管理、财务管理、分期付款、会员管理等全方位功能。

## 开发命令

### 前端开发
```bash
# 启动前端开发服务器（端口1420）
npm run dev

# 构建前端
npm run build

# 预览构建结果
npm run preview
```

### 后端开发
```bash
# 启动后端开发服务器（端口3001）
npm run backend

# 进入后端目录执行特定命令
cd backend
npm run dev          # 开发模式
npm run build        # 构建后端
npm start           # 生产模式启动
npm test            # 运行测试
npm run lint        # 代码检查
```

### 完整开发环境
```bash
# 同时启动前后端服务器
npm run dev:full
```

### 数据库操作
```bash
cd backend
npm run seed                   # 数据库初始化
```

## 架构和技术栈

### 前端架构 (Vue 3 + TypeScript)
- **入口**: `src/main.ts` - 根据用户协议状态挂载不同组件
- **主应用**: `src/MainApp.vue` - 主应用组件
- **API层**: `src/api/ApiService.ts` - 封装所有RESTful API调用，包含重试机制和错误处理
- **类型系统**: `src/types/api.ts` - 完整的TypeScript API类型定义
- **组件库**: `src/components/` - 功能组件（仪表板、学员管理、成绩管理、财务统计等）

### 后端架构 (Node.js + Express + TypeScript)
- **入口**: `backend/src/index.ts` - 服务器启动和配置验证
- **应用核心**: `backend/src/app.ts` - Express应用配置，中间件，安全设置
- **数据库**: MongoDB，使用Mongoose进行数据建模
- **路由**: `backend/src/routes/` - RESTful API路由定义
- **模型层**: 使用Mongoose ODM进行数据建模
- **中间���**: 认证、速率限制、错误处理、请求验证

### 数据流动
- 前端通过Axios调用REST API，数据经过transformers验证和转换
- Vite代理配置：前端`/api` -> 后端`http://localhost:3001/api/v1`
- API响应格式统一：`{ success: boolean, data?: any, error?: string }`

## 核心功能模块

### 学员管理 (`/students`)
- CRUD操作支持分页、搜索、排序
- 学员信息包括：基本信息、课程信息、会员状态
- 成绩管理：分数录入、历史记录、统计分析

### 财务管理 (`/transactions`)
- 交易记录：普通交易和分期付款
- 财务统计：多维度数据分析
- 分期计划：支持多种频率和自定义计划

### 会员管理 (`/membership`)
- 会员期限：月卡、年卡、自定义日期
- 到期提醒和批量操作
- 会员状态跟踪

### 统计报表 (`/dashboard`)
- 实时统计：学生数量、财务状况、会员活跃度
- 数据可视化支持（前端实现）
- 全局和个体化分析

## 开发注意事项

### 前端开发
- 所有API调用都必须使用`ApiService`类的方法，不要直接使用Axios
- 组件必须使用TypeScript类型定义，类型文件位于`src/types/`
- 错误处理统一使用`src/utils/errorHandler.ts`中的`handleApiOperation`
- 数据转换和验证使用`src/api/dataTransformers.ts`

### 后端开发
- 新API端点需要在routes、controllers、models、types四个层面对应实现
- 数据库操作使用Mongoose ODM
- 所有API返回必须遵循统一格式，使用中间件确保一致性
- 配置管理通过`backend/src/config/`统一处理，支持环境变量

### 代码质量
- ESLint配置已设置，后端使用`npm run lint`检查
- TypeScript严格模式已启用
- API必须有错误处理和日志记录
- 数据验证使用Joi进行输入验证

### 环境配置
- 开发环境端口：前端1420，后端3001
- 数据库：MongoDB
- 日志级别可通过环境变量控制
- CORS和安全设置已预配置