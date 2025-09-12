# QMX Chris233 - 启明星管理系统

This is a Tauri desktop application for student management with Vue 3 frontend and Rust backend.

## Development Commands

### Frontend (Vue + Vite)
- `pnpm dev` - Start development server (port 1420)
- `pnpm build` - Build frontend for production
- `pnpm preview` - Preview production build

### Tauri Application
- `pnpm tauri dev` - Start Tauri development mode
- `pnpm tauri build` - Build desktop application

### TypeScript
- `pnpm vue-tsc --noEmit` - Type checking (runs before build)

## Architecture Overview

### Frontend Structure
- **Vue 3 + TypeScript + Vite** - Modern frontend stack
- **Single Page Application** with tab-based navigation
- **Responsive Design** - Desktop navigation + mobile sidebar
- **Component-based** - Each feature is a separate Vue component

### Main Components
- `MainApp.vue` - Root component with navigation and routing
- `StudentManagement.vue` - Student CRUD operations
- `FinancialStatistics.vue` - Revenue/expense tracking
- `ScoreManagement.vue` - Student score tracking
- `Dashboard.vue` - Overview statistics
- `Settings.vue` - Application settings
- `UserAgreement.vue` - Initial user agreement screen

### Backend Structure (Rust)
- **Tauri Commands** - Bridge between frontend and backend
- **Database Layer** - Uses `qmx_backend_lib` for data persistence
- **Thread-safe State** - Global database instance with Mutex
- **Domain Models** - Student, Cash (transactions), Installments

### Key Backend Commands
- Student Management: `add_student`, `get_all_students`, `update_student_info`, `delete_student`
- Score Management: `add_score`, `get_student_scores`
- Financial Management: `add_cash_transaction`, `get_all_transactions`, `delete_cash_transaction`
- Installment System: `update_installment_status`, `generate_next_installment`, `cancel_installment_plan`
- Statistics: `get_dashboard_stats`

### Data Flow
1. Frontend components call Tauri commands via `@tauri-apps/api`
2. Rust backend processes requests using domain logic from `qmx_backend_lib`
3. Database operations are thread-safe using `OnceLock<Mutex<Database>>`
4. All changes are persisted to disk via `save()` function

### External Dependencies
- **Backend Library**: `qmx_backend_lib` (local path dependency)
- **Phone Validation**: `libphonenumber-js` for phone number handling
- **Date Handling**: `chrono` for date/time operations in Rust

### Configuration
- **Window Settings**: 1500x1000 default size, Chinese title "启明星管理软件"
- **Development Port**: 1420 (fixed for Tauri compatibility)
- **Theme Support**: Dark/light theme with CSS variables