# QMX 启明星学生管理系统

<div align="center">

![Version](https://img.shields.io/badge/version-0.13.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Test Coverage](https://img.shields.io/badge/coverage-85%25-yellowgreen.svg)

现代化的教育培训机构学生管理系统，采用前后端分离架构。

</div>

## 项目愿景

QMX（启明星）是一个现代化的教育培训机构学生管理系统，旨在为教育机构提供全方位的学员管理、成绩跟踪、财务管理和会员服务。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Vue 3 + TypeScript | Composition API, Vite构建 |
| **状态管理** | Pinia | 类型安全的状态管理 |
| **HTTP客户端** | Axios | 请求封装, 重试机制 |
| **后端** | Node.js + Express | RESTful API |
| **ORM** | Drizzle ORM | 类型安全的数据库操作 |
| **数据库** | PostgreSQL | 主数据存储 |
| **测试** | Vitest + Jest + Playwright | 单元/集成/E2E测试 |
| **CI/CD** | GitHub Actions | 自动化工作流 |

## 核心功能

- [x] 学员信息管理（CRUD、搜索、分页）
- [x] 成绩管理（录入、统计、分析）
- [x] 财务管理（收支记录、分期付款）
- [x] 会员管理（期限设置、状态跟踪、到期提醒）
- [x] 数据统计（仪表板、财务分析、学员表现）
- [x] **访问控制**（密码认证、管理员模式）

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- PostgreSQL >= 14
- pnpm >= 8.0.0

### 安装依赖

```bash
# 使用pnpm安装所有依赖
pnpm install

# 或分别安装
pnpm install                  # 前端依赖
cd backend && pnpm install    # 后端依赖
```

### 环境配置

```bash
# 复制环境变量示例
cp .env.example .env

# 后端环境配置
cd backend
cp .env.example .env
# 编辑 .env 文件配置PostgreSQL连接等参数
```

### 启动开发服务器

```bash
# 同时启动前后端 (推荐)
pnpm run dev:full

# 或分别启动
pnpm run dev      # 前端 (http://localhost:1420)
pnpm run backend  # 后端 (http://localhost:3001)
```

### 数据库操作

```bash
# 生成迁移
cd backend && pnpm run db:generate

# 执行迁移
cd backend && pnpm run db:migrate

# 推送Schema变更 (开发环境)
cd backend && pnpm run db:push

# 打开Drizzle Studio
cd backend && pnpm run db:studio
```

## 项目结构

```
QMX/
├── src/                      # 前端源码
│   ├── api/                  # API客户端
│   ├── components/           # Vue组件
│   ├── stores/               # Pinia状态管理
│   ├── types/                # TypeScript类型
│   └── utils/                # 工具函数
│
├── backend/                  # 后端源码
│   ├── src/
│   │   ├── config/           # 配置
│   │   ├── controllers/      # 控制器
│   │   ├── db/
│   │   │   ├── schema/       # Drizzle Schema
│   │   │   └── repositories/ # 数据仓储
│   │   ├── middleware/       # 中间件
│   │   ├── routes/           # 路由
│   │   ├── services/         # 业务逻辑
│   │   └── utils/            # 工具
│   └── __tests__/            # 测试
│
├── tests/                    # E2E测试
├── docs/                     # 文档
└── CLAUDE.md                 # AI上下文文档
```

## 测试

```bash
# 前端单元测试
pnpm run test:frontend

# 后端测试
pnpm run test:backend

# E2E测试
pnpm run e2e

# 带覆盖率
pnpm run test:frontend:coverage
pnpm run test:backend:coverage
```

## 构建

```bash
# 前端构建
pnpm run build

# 后端构建
pnpm run build:backend

# 生产环境启动
cd backend && pnpm start
```

## 文档

- [完整文档](./docs/README.md)
- [认证系统](./docs/auth.md)
- [CLAUDE.md](./CLAUDE.md) - AI开发指南
- [后端文档](./backend/README.md)
- [测试文档](./docs/testing/README.md)

## 访问控制

系统采用简单密码认证机制保护系统访问。

### 首次访问配置

```bash
# 生成 bcrypt 哈希密码
cd backend && node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your_password', 10));"

# 后端环境变量 (.env)
QMX_ADMIN_PASSWORD_HASH="$2a$10$xxxxxxxxxx"

# 前端环境变量 (.env)
VITE_ADMIN_PASSWORD_HASH="$2a$10$xxxxxxxxxx"
```

详细配置说明请参阅 [认证系统文档](./docs/auth.md)。

## 更新日志

详见 [CLAUDE.md](./CLAUDE.md#变更记录-changelog)

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件

## 贡献者

感谢所有贡献者！

---

**维护者**: H-Chris233
**最后更新**: 2025-01-10
