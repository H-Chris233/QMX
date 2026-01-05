# AGENTS.md

## Project Name
QMX – 启明星学生管理系统 (qmx-chris233 monorepo)

## Overview
This is a pnpm-managed monorepo that houses a Vue 3 + Vite SPA (src + public) alongside a dedicated Express/TypeScript backend (backend/). The workspace is centered on a student, finance, membership, and dashboard management experience for education institutions; the root package simply wires together the frontend-focused development workflow while the backend ship lives in `backend/` with its own dependencies and scripts.

Front-end pages interact with the backend API via `/api` proxying, while Vitest-powered unit/component tests, Playwright E2E tests, and a rich fixtures/helpers library under `tests/` keep quality high. Supporting docs (`docs/`, `tests/README.md`, etc.) document the workspace, hardcoded value audits, testing coverage, and workspace best practices so new contributors can get oriented quickly.

## Technology Stack
- **Language/Runtime**: TypeScript everywhere (frontend, backend, tests) targeting Node >=18 with modern ECMAScript modules; runtime is Vite for the browser app and Node/Express for the server.
- **Framework(s)**: Vue 3 + Pinia/UI component system on the client, Express + Mongoose + Joi + Winston on the server, plus MSW for request mocking.
- **Key Dependencies**: Vue, Pinia, Axios, libphonenumber-js, Vitest/Vite, Playwright, MSW, Express, Mongoose, JWT, Joi, Winston, rate-limiter-flexible, pnpm workspace utilities.
- **Build Tools**: Vite + vue-tsc (frontend), Rollup-based build via Vite, ts-node/nodemon/tsc for backend builds, Jest (backend tests) and Vitest (frontend), Playwright for E2E, pnpm workspace commands for orchestration.

## Project Structure
```
.                              # frontend-centric workspace root
├── backend/                    # Express + Mongo REST API, own tsconfig/package files
│   ├── src/                    # server code (config, controllers, models, routes, utils, types)
│   └── scripts/ seed, bootstrap # startup helpers
├── docs/                       # governance, testing, workspace guides, hardcode audits
├── src/                        # Vue 3 SPA entry points, components, stores, utils, assets
├── public/                     # static assets served by Vite
├── tests/                      # shared fixtures, factories, helpers, MSW mocks for frontend tests
├── scripts/                    # helpers such as E2E orchestration or coverage checks
├── .github/                    # CI workflows for frontend/backend/integration jobs
├── package.json                # root scripts (dev, build, test, coverage, e2e, preview)
├── pnpm-workspace.yaml         # pnpm workspace definition
├── tsconfig.json              
├── vite.config.ts              # Vite dev server + proxy + alias config
└── vitest.config.ts           # Vitest/coverage settings
```

## Key Features
- Student management dashboard with CRUD, advanced search, and membership life-cycle views.
- Finance management covering cash flow, installment tracking, and reporting metrics.
- Member management flows with membership status, expirations, and batch operations.
- Statistics/telemetry dashboards for overall performance (financials, grades, membership health).
- Robust testing story: Vitest unit + component suites, Jest backend suites, Playwright E2E, MSW fixtures, and coverage targets.

## Getting Started
### Prerequisites
- Node.js >= 18.0.0 (per backend `engines`).
- npm or pnpm installed (pnpm workspace commands are the primary workflow).
- MongoDB for backend development (local instance or connection string in `.env`).

### Installation
```bash
pnpm install                             # install all workspace deps
pnpm install --filter backend             # (optional) re-install backend-only if you work there
```
*(You can also use `npm install` at the root and in `backend/` if pnpm is unavailable.)*

### Usage
```bash
pnpm dev:full            # run backend (Express) + frontend (Vite) simultaneously
pnpm backend             # start backend alone (nodemon/ts-node) on 3001
pnpm dev                 # start Vite frontend on 1420 with /api proxying
pnpm preview             # serve the production build on port 1420
```
For E2E checks, run Playwright via `pnpm e2e`, `pnpm e2e:headed`, `pnpm e2e:report`, etc., and use `pnpm e2e:core` for the custom Core runner.

## Development
### Available Scripts
- `pnpm dev`, `pnpm start`: launch the Vite dev server (frontend only).
- `pnpm build`, `pnpm build:frontend`: run `vue-tsc --noEmit && vite build` for production artifacts.
- `pnpm build:backend`: delegate to `pnpm run --filter qmx-backend build` to compile the Express server.
- `pnpm test`, `pnpm test:frontend`: run Vitest suites (with `vitest.config.ts`/`tests/setup.ts`).
- `pnpm test:coverage`: Vitest with coverage output; `pnpm coverage` runs the helper script for combined reports.
- `pnpm test:backend`: run Jest inside `backend/`; `test:backend:coverage` for coverage.
- `pnpm e2e`, `pnpm e2e:headed`, `pnpm e2e:report`, `pnpm e2e:core`: Playwright and scripted Playwright flows.
- `pnpm lint:*`: placeholder echoes; backend linting lives behind `pnpm run --filter qmx-backend lint`.
- `pnpm clean`: cleans backend build outputs and Vite cache.
- Backend scripts (inside `backend/package.json`): `dev`, `build`, `start`, `test`, `lint`, `seed`, plus watch/coverage helpers.

### Development Workflow
1. Install workspace dependencies (pnpm). 2. Run `pnpm dev:full` to keep Vite + Express in sync while editing UI or API. 3. Frontend tests (Vitest + MSW fixtures) rely on `tests/setup.ts` plus helpers/factories; backend tests use Jest + mongodb-memory-server. 4. Use Playwright (`pnpm e2e`) for cross-browser smoke checks or `scripts/run-e2e-core.js` for curated suites. 5. After changes, run coverage commands and lint scripts; the workspace includes `scripts/check-coverage.sh` for consolidated reporting.

## Configuration
- `.env.example` (root) sets shared frontend vars; frontend respects Vite env files (`.env.local`, `.env.development`, `.env.production`).
- Backend uses `backend/.env.example` (copy to `.env`). Key vars: `PORT`, `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `LOG_LEVEL`, `LOG_FILE`, etc., validated via `backend/src/config/`.
- `vite.config.ts` defines dev server proxying `/api` → `http://localhost:3001`, host binding, and `@` alias for `src/`.
- `tsconfig.json`/`tsconfig.node.json` enforce strict-mode TypeScript settings, bundler-style resolution, and allowed file extensions; backend has its own tsconfig.
- Playwright config lives in `playwright.config.ts`/`playwright.core.config.ts`; `scripts/run-e2e-core.js` glues custom runs.
- `settings.local.json` (workspace metadata) controls cleanup periods and allowed directories for cross-repository references.

## Architecture
The workspace is deliberately split: Vite + Vue 3 provides an SPA that communicates with the Express API through the `/api` proxy. Pinia manages client state, MSW supplies deterministic mock data for Vitest, and Playwright covers full-stack flows. The backend is structured around Express routers/controllers/models in TypeScript, connects to MongoDB via Mongoose, and secures interactions with JWT, Helmet, CORS, and Joi for validation. Tests span Vitest (front), Jest/mongodb-memory-server (backend), and Playwright (E2E), with shared factories/fixtures in `tests/` to keep data consistent.

## Contributing
Follow the documented flow: fork, create a descriptive feature branch, make commits, and open a pull request (the docs/README guidance lists these steps). Reuse the `tests/` fixtures/factories and `docs/` hardcoded-value audits when adding new features or API endpoints. For workspace-specific advice, consult `docs/WORKSPACE.md` and `docs/TESTING.md` (updates, linting, pnpm workspace commands).

## License
The root workspace is marked `private` and does not publish a license, but the backend package explicitly lists the MIT license (`backend/package.json`).
