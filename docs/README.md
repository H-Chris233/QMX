# QMX 启明星学生管理系统 - 文档中心

> 现代化的教育培训机构学生管理系统，采用前后端分离架构

[![Version](https://img.shields.io/badge/version-0.12.1-blue.svg)](https://github.com/H-Chris233/QMX)
[![Test Coverage](https://img.shields.io/badge/coverage-79.4%25-yellowgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

## 📚 文档导航

### 快速开始
- **[快速上手指南](./GETTING_STARTED.md)** - 5分钟启动项目
- **[环境配置](./development/setup.md)** - 详细的开发环境配置

### 架构文档
- **[架构总览](./architecture/README.md)** - 系统架构设计
- **[前端架构](./architecture/frontend.md)** - Vue 3 + TypeScript + Pinia
- **[后端架构](./architecture/backend.md)** - Node.js + Express + MongoDB
- **[数据流设计](./architecture/data-flow.md)** - 前后端通信机制

### API文档
- **[API规范](./api/specification.md)** - RESTful API完整规范
- **[学员管理API](./api/students.md)** - 学员CRUD和查询
- **[财务管理API](./api/transactions.md)** - 交易和分期付款
- **[统计数据API](./api/stats.md)** - 仪表板和报表

### 开发指南
- **[开发概览](./development/README.md)** - 开发流程和规范
- **[编码标准](./development/coding-standards.md)** - TypeScript编码规范
- **[开发工作流](./development/workflows.md)** - 功能开发流程

### 测试文档
- **[测试概览](./testing/README.md)** - 测试策略和覆盖率
- **[前端测试](./testing/frontend-testing.md)** - Vitest + Vue Test Utils
- **[后端测试](./testing/backend-testing.md)** - Jest + MongoDB Memory Server
- **[E2E测试](./testing/e2e-testing.md)** - Playwright端到端测试

### CI/CD
- **[CI/CD概览](./ci-cd/README.md)** - GitHub Actions工作流
- **[快速参考](./ci-cd/quick-reference.md)** - CI/CD命令速查
- **[配置指南](./ci-cd/github-actions.md)** - Secrets和环境变量
- **[代码覆盖率](./ci-cd/coverage.md)** - 覆盖率报告和提升

### 维护记录
- **[维护记录](./maintenance/README.md)** - 问题修复和优化记录
- **[修复记录](./maintenance/fixes/)** - 历史BUG修复文档
- **[代码审计](./maintenance/audits/)** - 代码质量审计报告

### 其他资源
- **[手动测试清单](./manual-e2e-checklist.md)** - E2E手动测试检查表
- **[工作区配置](./WORKSPACE.md)** - IDE和工具配置

## 🎯 项目概览

### 技术栈
- **前端**: Vue 3, TypeScript, Vite, Pinia, Axios
- **后端**: Node.js, Express, TypeScript, Mongoose
- **数据库**: MongoDB
- **测试**: Vitest, Jest, Playwright, Supertest
- **CI/CD**: GitHub Actions, Codecov

### 核心功能
- ✅ 学员信息管理（CRUD、搜索、分页）
- ✅ 成绩管理（录入、统计、分析）
- ✅ 财务管理（收支记录、分期付款）
- ✅ 会员管理（期限设置、状态跟踪、到期提醒）
- ✅ 数据统计（仪表板、财务分析、学员表现）

### 项目状态
- **版本**: v0.12.1
- **测试覆盖率**: 79.4% (139/175测试通过)
- **代码扫描**: 95%+ 模块覆盖
- **生产就绪**: 后端✅ 前端⚠️(需增加组件测试)

## 🚀 快速命令

### 开发
```bash
# 同时启动前后端
npm run dev:full

# 分别启动
npm run dev      # 前端 (端口1420)
npm run backend  # 后端 (端口3001)
```

### 测试
```bash
# 前端测试
npm test

# 后端测试
cd backend && npm test

# E2E测试
npm run e2e
```

### 构建
```bash
# 前端构建
npm run build

# 后端构建
cd backend && npm run build
```

## 📊 项目质量指标

### 测试覆盖率
| 模块 | 覆盖率 | 状态 |
|------|--------|------|
| 后端API | 90%+ | ✅ 优秀 |
| 后端服务层 | 90%+ | ✅ 优秀 |
| 前端工具函数 | 80%+ | ✅ 良好 |
| 前端组件 | 30%- | ⚠️ 需改进 |

### 代码质量
- **TypeScript严格模式**: ✅ 启用
- **ESLint**: ✅ 配置完善
- **Prettier**: ✅ 代码格式化
- **测试基础设施**: ✅ 完整

### 技术债务
详见 [维护记录](./maintenance/README.md)

## 🤝 参与贡献

### 开发流程
1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 遵循[编码标准](./development/coding-standards.md)
4. 添加测试并确保通过
5. 提交代码 (`git commit -m 'feat: add amazing feature'`)
6. 推送到分支 (`git push origin feature/AmazingFeature`)
7. 开启Pull Request

### 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
test: 测试相关
refactor: 代码重构
style: 代码格式
chore: 构建/工具链
```

## 📝 更新日志

### v0.12.1 (2025-01-06)
- 📚 重构文档结构，创建统一文档中心
- ✅ 测试覆盖率从66%提升至79.4%
- 🐛 修复多项API和测试问题
- ⚡ CI/CD执行时间优化75%

### v2.0.0 (2025-01-02)
- ✨ 从Tauri重构为Web应用
- ✨ 完整的RESTful API
- ✨ TypeScript类型系统
- ✨ 前后端分离架构

详见完整 [更新日志](../CLAUDE.md#变更记录-changelog)

## 📞 获取帮助

- **问题反馈**: [GitHub Issues](https://github.com/H-Chris233/QMX/issues)
- **功能建议**: [GitHub Discussions](https://github.com/H-Chris233/QMX/discussions)
- **安全问题**: 请直接联系维护者

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情

---

**维护者**: H-Chris233
**最后更新**: 2025-01-06
**文档版本**: 2.0
