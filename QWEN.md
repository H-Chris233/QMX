# QWEN.md - 启明星管理系统 (QMX) Context

## Project Overview

启明星管理系统 (QMX) is a cross-platform desktop application built with Tauri, using Vue 3 + Vite + TypeScript for the frontend and Rust for the backend. It's designed for student management, score tracking, financial statistics, and installment payment management.

### Key Features
- Student Management: Add, search, update, delete students
- Score Management: Record and query student scores
- Financial Management: Record income/expense transactions, transaction search and deletion
- Installment Payment: Create installments, update status, generate next installment, cancel plans, query by plan
- Dashboard Statistics: Student count, total income/expense, average and highest scores, active courses
- Theme & Responsive Design: Dark/light theme switching, desktop navigation + mobile sidebar

## Technology Stack

### Frontend
- Vue 3 (Composition API)
- TypeScript
- Vite build system
- Tauri API for backend communication
- libphonenumber-js for phone number validation

### Backend
- Rust (Tauri framework)
- qmx_backend_lib (custom backend library)
- Serde for serialization
- Chrono for date/time handling
- Tauri for desktop application framework

### Development Tools
- pnpm as package manager
- Vite for frontend development
- Tauri CLI for desktop app building

## Important Development Notes

### Rust Backend Compilation
**Current Practice**: Use frontend-only development mode during development.

**Workflow:**
- Use `pnpm dev` for frontend development and testing (port 1420)
- Only use `pnpm tauri dev` when backend changes are necessary
- Reserve `pnpm tauri build` for final production builds

## Project Structure

```
QMX/
├── src/                    # Frontend source code
│   ├── components/         # Vue components
│   ├── api/               # API service layer
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── MainApp.vue         # Main application component
│   └── main.ts             # Application entry point
├── src-tauri/              # Tauri/Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri app entry point
│   │   └── lib.rs          # Command definitions
│   │   └── validation.rs   # Validation functions
│   ├── tauri.conf.json     # Tauri configuration
│   └── Cargo.toml          # Rust dependencies
├── public/                 # Static assets
└── dist/                   # Build output (generated)
```

## Development Workflow

### Environment Requirements
- Node.js (with pnpm)
- Rust (with cargo)
- Tauri CLI (included as devDependency)

### Key Commands

- Install dependencies: `pnpm install`
- Frontend development server (Vite, port 1420): `pnpm dev`
- Start Tauri development mode (includes frontend): `pnpm tauri dev`
- Build frontend and perform TypeScript type checking: `pnpm build`
- Build desktop application: `pnpm tauri build`
- Preview frontend build: `pnpm preview`
- TypeScript type checking: `pnpm vue-tsc --noEmit`

### Frontend (Vue + Vite)
- `pnpm dev` - Start development server (port 1420)
- `pnpm build` - Build frontend for production
- `pnpm preview` - Preview production build

### Tauri Application
- `pnpm tauri dev` - Start Tauri development mode
- `pnpm tauri build` - Build desktop application

### TypeScript
- `pnpm vue-tsc --noEmit` - Type checking (runs before build)

## Architecture

### Frontend Structure
- **Vue 3 + TypeScript + Vite** - Modern frontend stack
- **Single Page Application** with tab-based navigation
- **Responsive Design** - Desktop navigation + mobile sidebar
- **Component-based** - Each feature is a separate Vue component

### Backend Structure
- **Tauri Commands** - Bridge between frontend and backend
- **Database Layer** - Uses `qmx_backend_lib` for data persistence
- **Thread-safe State** - Global database instance with Mutex
- **Domain Models** - Student, Cash (transactions), Installments

## Key Backend Commands
- Student Management: `add_student`, `get_all_students`, `update_student_info`, `delete_student`
- Score Management: `add_score`, `get_student_scores`, `delete_student_score`, `update_student_score`
- Financial Management: `add_cash_transaction`, `get_all_transactions`, `delete_cash_transaction`
- Installment System: `update_installment_status`, `generate_next_installment`, `cancel_installment_plan`, `get_installments_by_plan`
- Statistics: `get_dashboard_stats`
- Membership: `set_student_membership`, `clear_student_membership`, `set_membership_by_type`
- Search: `search_students`, `search_cash`, `get_membership_expiring_soon`

## Configuration & Conventions

### Development Settings
- Fixed development port: 1420 (vite.config.ts, tauri.conf.json)
- Default window size: 1500x1000, title "启明星管理软件"
- Local dependency: qmx_backend_lib referenced in Cargo.toml

### Application Window
- Product name: "QMX"
- Window title: "启明星管理软件"
- Default dimensions: 1500x1000

### Configuration
- **Window Settings**: 1500x1000 default size, Chinese title "启明星管理软件"
- **Development Port**: 1420 (fixed for Tauri compatibility)
- **Theme Support**: Dark/light theme with CSS variables

### External Dependencies
- **Backend Library**: `qmx_backend_lib` (local path dependency)
- **Phone Validation**: `libphonenumber-js` for phone number handling
- **Date Handling**: `chrono` for date/time operations in Rust

### Data Validation
- **Centralized Backend Validation**: All validation logic is centralized in the backend for consistency and security
- **Frontend Basic Checks**: Frontend only performs basic type checking and lets the backend handle detailed validation
- **Modular Validation**: Validation functions are organized in a separate module (`src-tauri/src/validation.rs`)
- Phone number validation using libphonenumber-js
- Age validation (3-120 years)
- Score validation (0-1000 range)
- Amount validation (up to 1 million)
- Date validation and formatting
- Custom validation functions for various data types (student UID, transaction UID, plan ID, etc.)

## 错误处理架构 (当前状态)

### 当前实现
1. **简化错误处理机制** - 所有错误通过模态框显示，不使用全局错误状态管理
2. **优先级区分** - 三种错误类型具有不同优先级：
   - 验证错误：低优先级
   - 网络错误：中优先级
   - API错误：高优先级
3. **模态框显示** - 使用ErrorModal组件显示所有错误，带有优先级标识
4. **跨环境兼容** - 浏览器环境使用UI显示，Node.js环境使用控制台记录

### 未来改进方向
1. **增强错误上下文** - 为不同类型错误提供更丰富的上下文信息
2. **错误分组和过滤** - 在UI中提供错误分类和过滤功能
3. **错误统计和分析** - 添加错误发生频率统计和趋势分析
4. **用户反馈集成** - 允许用户直接从错误模态框报告问题
5. **错误自动恢复** - 实现智能错误恢复机制，减少用户干预
6. **本地化支持** - 为错误消息提供多语言支持
7. **错误导出功能** - 允许用户导出错误日志用于调试

## License
No license declared.

## Additional Notes
- The application uses localStorage for persisting user preferences like theme and active tab
- Implements responsive design with mobile sidebar for small screens and horizontal navigation for larger screens
- Uses a global error handling system with retry capabilities
- Implements search and filtering capabilities for students and transactions
- Supports membership management with expiration tracking
- Includes installment payment tracking with status management