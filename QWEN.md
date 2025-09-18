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
**DO NOT compile the Rust backend during development** - Use frontend-only development mode instead.

**Reasons:**
- Rust compilation takes extremely long time (several minutes)
- Tauri build process is resource-intensive
- Frontend development can be done independently using `pnpm dev`
- Backend changes are infrequent compared to frontend iterations

**Recommended workflow:**
- Use `pnpm dev` for frontend development and testing (port 1420)
- **DO NOT use `pnpm tauri dev`/'cargo build'/'cargo check'** - This triggers Rust backend compilation
- Only use `pnpm tauri dev` when backend changes are absolutely necessary
- Reserve `pnpm tauri build` for final production builds only

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

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Development:
   - Frontend development server (Vite, port 1420):
     ```bash
     pnpm dev
     ```
   - Start Tauri development mode (includes frontend):
     ```bash
     pnpm tauri dev
     ```

3. Building:
   - Build frontend and perform TypeScript type checking:
     ```bash
     pnpm build
     ```
   - Build desktop application:
     ```bash
     pnpm tauri build
     ```
   - Preview frontend build:
     ```bash
     pnpm preview
     ```

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

### Main Components
- `MainApp.vue` - Root component with navigation and routing
- `StudentManagement.vue` - Student CRUD operations
- `FinancialStatistics.vue` - Revenue/expense tracking
- `ScoreManagement.vue` - Student score tracking
- `Dashboard.vue` - Overview statistics
- `Settings.vue` - Application settings
- `UserAgreement.vue` - Initial user agreement screen

### Frontend Architecture
- Entry point: `src/main.ts` - Shows user agreement or main app based on local storage
- Main component: `src/MainApp.vue` - Provides top navigation/mobile sidebar, error modal, and tab switching
- Components:
  - StudentManagement.vue - Student management functionality
  - FinancialStatistics.vue - Financial tracking and statistics
  - ScoreManagement.vue - Score recording and management
  - Dashboard.vue - Dashboard with statistics
  - Settings.vue - Application settings
  - ErrorModal.vue - Error display component
  - UserAgreement.vue - Terms of service
- API Layer: `src/api/ApiService.ts` - Encapsulates all backend calls with error handling and data validation
- Error Handling: `src/utils/errorHandler.ts` - Standardized error management

### Backend Structure (Rust)
- **Tauri Commands** - Bridge between frontend and backend
- **Database Layer** - Uses `qmx_backend_lib` for data persistence
- **Thread-safe State** - Global database instance with Mutex
- **Domain Models** - Student, Cash (transactions), Installments

### Backend Architecture
- Entry point: `src-tauri/src/main.rs` - Calls library entry `run()`
- Core logic: `src-tauri/src/lib.rs` - Defines Tauri commands and manages global database instance through `OnceLock<Mutex<Database>>`
- Domain models and storage: Depends on local library `qmx_backend_lib` (students, transactions, installments, etc.)
- Dependencies declared in: `src-tauri/Cargo.toml`

### Data Flow
1. Frontend components call Tauri commands via `@tauri-apps/api`
2. Rust backend processes requests using domain logic from `qmx_backend_lib`
3. Database operations are thread-safe using `OnceLock<Mutex<Database>>`
4. All changes are persisted to disk via `save()` function

### Frontend-Backend Communication Flow
1. Frontend uses `@tauri-apps/api` to trigger `invoke` calls
2. Backend commands in `lib.rs` process requests, read/modify database and persist changes
3. Serialized responses are returned to frontend components for display

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
- Extensive input validation on both frontend and backend
- Phone number validation using libphonenumber-js
- Age validation (3-120 years)
- Score validation (0-1000 range)
- Amount validation (up to 1 million)
- Date validation and formatting

## License
No license declared.

## Additional Notes
- The application uses localStorage for persisting user preferences like theme and active tab
- Implements responsive design with mobile sidebar for small screens and horizontal navigation for larger screens
- Uses a global error handling system with retry capabilities
- Implements search and filtering capabilities for students and transactions
- Supports membership management with expiration tracking
- Includes installment payment tracking with status management