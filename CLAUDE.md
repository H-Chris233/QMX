# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Tauri + Vue 3 + TypeScript** desktop application called "启明星管理软件" (QMX Management Software). The project uses a hybrid architecture with a Rust backend and Vue.js frontend, currently focused on user agreement functionality with dark/light theme support.

## Development Commands

### Frontend Development
```bash
# Start development server
pnpm dev

# Build frontend for production
pnpm build

# Preview production build
pnpm preview

# Type checking
vue-tsc --noEmit
```

### Tauri Development
```bash
# Run Tauri development mode
pnpm tauri dev

# Build Tauri app
pnpm tauri build

# Tauri CLI commands
pnpm tauri [command]
```

### Full Build Process
```bash
# Production build (type check + frontend build + Tauri build)
pnpm build && pnpm tauri build
```

## Architecture

### Frontend Structure
- **Framework**: Vue 3 with Composition API and `<script setup>` syntax
- **Build Tool**: Vite with custom Tauri configuration
- **TypeScript**: Strict mode enabled with comprehensive linting rules
- **Styling**: CSS with CSS variables for theming, scoped component styles

### Backend Structure
- **Framework**: Tauri v2 with Rust
- **Main Entry**: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs::run()`
- **External Library**: Depends on `qmx_backend_lib` (located at `../../qmx_backend_lib`)
- **Commands**: Currently implements `open_settings_window` command

### Key Components
- **UserAgreement/App.vue**: Main user agreement interface with theme switching
- **Theme System**: Dark/light theme toggle with localStorage persistence
- **Component Structure**: Modular components in `src/UserAgreement/components/`

### Configuration
- **Tauri Config**: `src-tauri/tauri.conf.json` - Window title "启明星管理软件", 800x600 default
- **Vite Config**: Port 1420, HMR on port 1421, ignores `src-tauri` directory
- **TypeScript**: ES2020 target, strict mode, no unused locals/parameters

## Development Notes

### Tauri-Specific Configuration
- Development server runs on `http://localhost:1420`
- Frontend dist directory: `../dist`
- Uses Tauri v2 with unstable features enabled
- CSP (Content Security Policy) is set to null

### Build Process
1. Frontend builds with `vue-tsc --noEmit && vite build`
2. Tauri bundles the app with platform-specific packaging
3. Supports all platforms (Windows, macOS, Linux)

### External Dependencies
- **qmx_backend_lib**: External Rust library at `../../qmx_backend_lib`
- **Tauri Plugins**: Uses `tauri-plugin-opener` v2

### Current Functionality
- User agreement acceptance flow
- Dark/light theme switching
- Responsive design with mobile support
- Settings window command (backend)

### File Structure Conventions
- Vue components use PascalCase for filenames
- TypeScript files use `.ts` extension
- Rust files follow standard Rust conventions
- Component styles are scoped within Vue files