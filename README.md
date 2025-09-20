# 启明星管理系统（QMX）

一款基于 Tauri 的跨平台桌面应用，前端使用 Vue 3 + Vite + TypeScript，后端使用 Rust。用于学员管理、成绩管理、收支统计与分期缴费管理。

## 功能特性
- 学员管理：新增、查询、更新、删除
- 成绩管理：记录与查询学员分数
- 收支管理：记录收入/支出、交易查询与删除
- 分期缴费：创建分期、更新状态、生成下一期、取消计划、按计划查询
- 仪表盘统计：学员数量、总收入/支出、平均与最高分、活跃课程
- 主题与响应式：明暗主题切换，桌面导航 + 移动端侧边栏

## 快速开始

### 环境要求
- Node.js（建议与 pnpm）
- Rust（含 cargo）
- Tauri CLI（作为 devDependency 已包含）

### 安装依赖
```
pnpm install
```

### 开发调试
- 前端开发服务器（Vite，端口 1420）
```
pnpm dev
```
- 启动 Tauri 开发模式（会自动运行前端）
```
pnpm tauri dev
```

### 构建
- 构建前端并进行 TS 类型检查
```
pnpm build
```
- 构建桌面应用
```
pnpm tauri build
```
- 预览前端构建产物
```
pnpm preview
```

## 架构概览

### 前端（/src）
- 入口：src/main.ts，根据本地协议显示用户协议或主应用
- 根组件：src/MainApp.vue，提供顶部导航/移动侧边栏、错误弹窗与 tab 切换
- 主要组件：
  - 学员管理：src/components/StudentManagement.vue
  - 收支统计：src/components/FinancialStatistics.vue
  - 成绩管理：src/components/ScoreManagement.vue
  - 仪表盘：src/components/Dashboard.vue
  - 设置：src/components/Settings.vue
  - 错误弹窗：src/components/ErrorModal.vue
  - 用户协议：src/components/UserAgreement.vue
- API 辅助：src/api/（ApiService.ts、dataTransformers.ts）

### 后端（/src-tauri）
- 入口：src-tauri/src/main.rs 调用库入口 run()
- 核心逻辑：src-tauri/src/lib.rs 定义 Tauri commands，并通过 OnceLock<Mutex<Database>> 管理全局数据库实例
- 领域模型与存储：依赖本地库 qmx_backend_lib（学生、交易、分期等）
- 配置：src-tauri/tauri.conf.json（窗口尺寸/标题、开发端口 1420、打包图标等）
- Cargo.toml：声明 tauri、serde、chrono、qmx_backend_lib 等依赖

### 前后端交互流程
1. 前端使用 @tauri-apps/api 触发 invoke 调用
2. 后端命令在 lib.rs 中处理，读取/修改数据库并持久化
3. 返回序列化后的响应给前端组件展示

## 关键后端命令（节选）
- 学员：add_student, get_all_students, update_student_info, delete_student
- 成绩：add_score, get_student_scores
- 资金：add_cash_transaction, get_all_transactions, delete_cash_transaction
- 分期：update_installment_status, generate_next_installment, cancel_installment_plan, get_installments_by_plan
- 统计：get_dashboard_stats

## 配置与约定
- 固定开发端口：1420（vite.config.ts、tauri.conf.json）
- 窗口默认尺寸：1500x1000，标题“启明星管理软件”
- 数据库依赖：qmx_backend_lib 通过 Cargo.toml 指向https://github.com/H-Chris233/qmx_backend_lib

## 许可证
暂未声明。