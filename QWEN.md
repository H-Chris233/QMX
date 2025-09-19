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

## Validation Logic Architecture

### Current State
All validation logic is centralized in the backend, with the frontend only performing basic type checks. This ensures consistency, security, and maintainability.

### Implementation
1. **Validation Module**: All validation functions located in `src-tauri/src/validation.rs`
2. **Backend Validation**: All business logic validation handled by backend
3. **Frontend Validation**: Basic type checking only in frontend API service

### Validation Module
- **File Location**: `src-tauri/src/validation.rs`
- **Functions**: 17 validation functions covering all data types:
  - `validate_student_name` - Validates student names (non-empty, max 50 chars, no control characters)
  - `validate_phone_number` - Validates phone numbers (non-empty, max 20 chars)
  - `validate_note` - Validates notes (max 1000 chars, no control characters)
  - `validate_age` - Validates age (3-120 years)
  - `validate_amount` - Validates amounts (up to 1 million)
  - `validate_class_type` - Validates class types (TenTry, Month, Year, Others)
  - `validate_subject_type` - Validates subject types (Shooting, Archery, Others)
  - `validate_score` - Validates scores (0-1000 range, finite numbers)
  - `validate_student_uid` - Validates student UIDs (non-zero)
  - `validate_transaction_uid` - Validates transaction UIDs (non-zero)
  - `validate_plan_id` - Validates plan IDs (non-zero)
  - `validate_installment_count` - Validates installment counts (1-360)
  - `validate_frequency` - Validates payment frequencies (Weekly, Monthly, Quarterly, Custom)
  - `validate_date_range` - Validates date ranges (start before end)
  - `validate_amount_range` - Validates amount ranges (min ≤ max)
  - `validate_age_range` - Validates age ranges (min ≤ max)
  - `validate_days` - Validates days (positive numbers)
- **Usage**: Imported in `lib.rs` with `use validation::*;`
- **Future Direction**: Continue expanding validation coverage and improving error messages

### Frontend Validation
- **Current State**: Frontend performs basic type checking only (e.g., `typeof studentUid !== 'number'`), error handling through backend responses
- **Implementation**: Uses simple `throw new Error()` statements instead of `handleValidationError` calls
- **Future Direction**: Continue minimizing frontend validation to reduce complexity and improve performance

## Error Handling Architecture

### Current Implementation
1. **Simplified Error Handling** - All errors displayed through modal dialogs, without global error state management
2. **Priority Differentiation** - Three error types with different priorities:
   - Validation errors: Low priority
   - Network errors: Medium priority
   - API errors: High priority
3. **Modal Display** - All errors shown using ErrorModal component with priority indicators
4. **Cross-environment Compatibility** - UI display in browser environments, console logging in Node.js environments

### Future Usage Patterns
1. **Consistent Priority Usage** - Maintain consistent priority levels across all error types for unified user experience
2. **Context-aware Error Display** - Show error modals with appropriate context based on current user workflow
3. **Non-intrusive Error Presentation** - Use toast notifications for low-priority errors to minimize workflow disruption
4. **Persistent Error Tracking** - Log errors to localStorage for debugging while maintaining simplified architecture
5. **Error Boundary Integration** - Implement Vue error boundaries to catch unhandled errors gracefully
6. **Accessibility Compliance** - Ensure all error modals meet WCAG accessibility standards for screen readers
7. **Performance Optimization** - Debounce frequent error displays to prevent UI freezing from error spam

## License
No license declared.

## Additional Notes
- The application uses localStorage for persisting user preferences like theme and active tab
- Implements responsive design with mobile sidebar for small screens and horizontal navigation for larger screens
- Uses a global error handling system with retry capabilities
- Implements search and filtering capabilities for students and transactions
- Supports membership management with expiration tracking
- Includes installment payment tracking with status management