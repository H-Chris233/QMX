# QMX 快速上手指南

5分钟快速启动QMX启明星学生管理系统。

## ⚡ 快速启动

### 前置要求
- Node.js >= 18.0.0
- MongoDB >= 7.0 (本地开发)
- npm 或 pnpm

### 一键启动
```bash
# 1. 克隆仓库
git clone https://github.com/H-Chris233/QMX.git
cd QMX

# 2. 安装依赖
npm install

# 3. 安装后端依赖
cd backend && npm install && cd ..

# 4. 启动项目（前后端同时启动）
npm run dev:full
```

### 访问应用
- 🌐 前端: http://localhost:1420
- 🔧 后端API: http://localhost:3001
- 📊 健康检查: http://localhost:3001/health

## 📝 详细步骤

### 1. 环境准备

#### 安装Node.js
```bash
# 检查版本
node --version  # 应该 >= 18.0.0
npm --version
```

#### 安装MongoDB
**Docker方式（推荐）**:
```bash
docker run -d \
  --name qmx-mongodb \
  -p 27017:27017 \
  -v qmx-data:/data/db \
  mongo:7-alpine
```

**或本地安装**:
- macOS: `brew install mongodb-community@7.0`
- Ubuntu: 参考 [MongoDB官方文档](https://docs.mongodb.com/manual/installation/)
- Windows: 下载 [MongoDB安装包](https://www.mongodb.com/try/download/community)

### 2. 项目配置

#### 后端环境变量
创建 `backend/.env` 文件:
```bash
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/qmx

# CORS配置
CORS_ORIGIN=http://localhost:1420

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

#### 初始化数据库
```bash
cd backend
npm run seed  # 创建初始数据
```

### 3. 启动开发服务器

#### 方式一：同时启动（推荐）
```bash
npm run dev:full
```

#### 方式二：分别启动
```bash
# 终端1 - 启动后端
npm run backend

# 终端2 - 启动前端
npm run dev
```

### 4. 验证安装

#### 检查前端
访问 http://localhost:1420，应该看到：
- 🎨 登录界面或仪表板
- 📊 数据加载正常
- 🎯 无控制台错误

#### 检查后端
```bash
# 健康检查
curl http://localhost:3001/health

# API版本信息
curl http://localhost:3001/api/v1

# 获取学员列表
curl http://localhost:3001/api/v1/students
```

预期响应:
```json
{
  "success": true,
  "data": [...]
}
```

## 🎓 下一步

### 探索功能
1. **学员管理** - 添加、编辑、删除学员
2. **成绩录入** - 记录和查看学员成绩
3. **财务管理** - 管理收支和分期付款
4. **会员管理** - 设置会员期限和状态
5. **数据统计** - 查看各类统计报表

### 学习资源
- 📖 [架构文档](./architecture/README.md) - 了解系统设计
- 🔧 [API文档](./api/specification.md) - API详细说明
- 🧪 [测试文档](./testing/README.md) - 编写和运行测试
- 💻 [开发指南](./development/README.md) - 参与开发

## 🐛 常见问题

### 端口被占用
```bash
# 错误：EADDRINUSE: address already in use :::3001

# 解决：查找并杀死占用进程
lsof -i :3001
kill -9 <PID>
```

### MongoDB连接失败
```bash
# 错误：MongoNetworkError: connect ECONNREFUSED

# 解决：启动MongoDB
# Docker方式
docker start qmx-mongodb

# 或检查本地服务
sudo systemctl status mongod  # Linux
brew services start mongodb-community  # macOS
```

### 依赖安装失败
```bash
# 清理缓存重试
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 前端无法访问后端
**检查项**:
1. 后端是否启动: `curl http://localhost:3001/health`
2. CORS配置是否正确: 检查 `backend/.env` 中的 `CORS_ORIGIN`
3. Vite代理配置: 检查 `vite.config.ts` 中的 proxy 设置

**Vite代理配置**:
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

### 构建失败
```bash
# 检查TypeScript错误
npm run build

# 查看详细错误
npm run build -- --debug
```

## 💡 开发技巧

### 热重载
- 前端: Vite自动热重载
- 后端: 使用 `nodemon` 自动重启

### 调试
**前端调试**:
- Chrome DevTools
- Vue DevTools扩展

**后端调试**:
```bash
# VS Code launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "program": "${workspaceFolder}/backend/src/index.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### 数据库管理
**推荐工具**:
- [MongoDB Compass](https://www.mongodb.com/products/compass) - 官方GUI
- [Studio 3T](https://studio3t.com/) - 功能丰富的工具
- `mongosh` - 命令行工具

```bash
# 连接数据库
mongosh mongodb://localhost:27017/qmx

# 查看集合
show collections

# 查询数据
db.students.find().pretty()
```

## 📚 推荐阅读

### 新手入门
1. [项目架构概览](./architecture/README.md)
2. [API快速参考](./api/specification.md)
3. [编码规范](./development/coding-standards.md)

### 进阶开发
1. [开发工作流](./development/workflows.md)
2. [测试指南](./testing/README.md)
3. [CI/CD流程](./ci-cd/README.md)

### 问题排查
1. [测试错误分析](./maintenance/audits/test-errors/README.md)
2. [修复记录](./maintenance/fixes/)
3. [FAQ](../CLAUDE.md#问题排查)

## 🤝 获取帮助

- 📖 查看 [完整文档](./README.md)
- 🐛 提交 [Issue](https://github.com/H-Chris233/QMX/issues)
- 💬 加入 [Discussions](https://github.com/H-Chris233/QMX/discussions)

---

准备好了吗？开始你的QMX开发之旅吧！🚀

**下一步**: [了解项目架构](./architecture/README.md) →
