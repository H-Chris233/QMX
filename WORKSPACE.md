# QMX Pnpm Workspace 使用指南

## 📋 项目结构

```
QMX/
├── .                         # 根目录 (前端项目)
├── backend/                   # 后端项目
├── pnpm-workspace.yaml       # Workspace配置
└── package.json              # 根目录脚本
```

## 🚀 快速开始

### 安装依赖
```bash
# 安装所有项目依赖
pnpm install

# 只安装前端依赖
pnpm install --filter .

# 只安装后端依赖
pnpm install --filter backend
```

### 开发模式
```bash
# 启动前端开发服务器
pnpm dev

# 启动后端开发服务器
pnpm backend

# 同时启动前后端 (推荐)
pnpm dev:full
```

## 🏗️ 构建项目

```bash
# 构建前端
pnpm build:frontend

# 构建后端
pnpm build:backend

# 构建所有项目
pnpm build:all
```

## 🧪 运行测试

```bash
# 运行前端测试 (Vitest)
pnpm test:frontend

# 运行后端测试 (Jest)
pnpm test:backend

# 运行所有测试
pnpm test:all

# 生成覆盖率报告
pnpm test:coverage
```

## 🔍 代码检查

```bash
# 检查所有项目
pnpm lint

# 修复所有项目
pnpm lint:fix

# 只检查后端
pnpm lint:backend
```

## 🧹 清理项目

```bash
# 清理所有构建产物
pnpm clean
```

## 📦 Workspace 特性

### 依赖提升
```bash
# 依赖会自动提升到根目录
pnpm add axios -w              # 添加到workspace根目录
pnpm add express --filter backend  # 添加到backend项目
```

### 脚本执行
```bash
# 在特定项目中运行脚本
pnpm run --filter backend dev

# 在所有项目中运行脚本
pnpm run -r test  # -r 表示递归执行
```

### 查看依赖关系
```bash
# 查看项目依赖树
pnpm list --filter backend

# 查看所有项目依赖
pnpm list -r
```

## 🔄 CI/CD 流程

项目使用 GitHub Actions 进行持续集成：

1. **frontend**: 构建前端项目
2. **backend**: 构建和测试后端项目
3. **integration**: 运行所有测试和构建

## 💡 开发建议

### 1. 终端标签页管理
推荐使用不同的终端标签页：
- Tab 1: `pnpm dev` (前端)
- Tab 2: `pnpm backend` (后端)
- Tab 3: `pnpm test:backend --watch` (后端测试)

### 2. 调试配置
VS Code launch.json 配置示例：
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/index.ts",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### 3. 环境变量管理
```bash
# 前端环境变量
.env.local                    # 本地开发
.env.development              # 开发环境
.env.production               # 生产环境

# 后端环境变量 (backend/.env)
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/qmx
```

## 🛠️ 常见问题

### Q: 如何添加新的依赖？
A:
```bash
# 前端依赖
pnpm add vue-router

# 后端依赖
pnpm add --filter backend mongoose

# 开发依赖
pnpm add -D --filter backend @types/node
```

### Q: 如何处理端口冲突？
A: 修改对应的环境变量：
- 前端: `VITE_PORT=1421`
- 后端: `PORT=3002`

### Q: 如何重置项目？
A:
```bash
# 完全清理
pnpm clean
rm -rf node_modules
rm -rf backend/node_modules
pnpm install
```

## 📚 参考资源

- [pnpm workspace 文档](https://pnpm.io/workspaces)
- [Vite 文档](https://vitejs.dev/)
- [Express 文档](https://expressjs.com/)
- [Vue 3 文档](https://vuejs.org/)

---

**提示**: 使用 `pnpm -r <command>` 可以在所有子项目中执行命令！