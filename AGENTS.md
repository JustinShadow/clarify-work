# AGENTS.md

## Architecture

This is a dual-platform work report management app (Web + Desktop) sharing a single frontend codebase.

- **`shared/src/`** is the sole source of truth for all frontend code. Every component, page, type, and API call lives here.
- **`web-app/`** (Web) and **`desktop-app/`** (Desktop/Tauri) are thin shells — each contains only `main.tsx`, `index.css`, and a Vite config.
- The root `package.json` installs shared deps so `shared/src/` can resolve bare imports (e.g. `lucide-react`, `@tauri-apps/api`).

**Never duplicate code between `web-app/` and `desktop-app/`** — edit `shared/src/` only.

## Key Design Patterns

- **API adapter switching**: `shared/src/api/index.ts` uses runtime `isTauri` check to dynamically load `web-adapter.ts` or `tauri-adapter.ts`. `initAPI()` must be called before any API usage (done in `main.tsx`).
- **Tailwind CSS split**: `@import "tailwindcss"` lives in each app's `index.css` (not in `shared/`), because `shared/` has no `tailwindcss` dependency. The `@source` directive points Vite at `shared/src/**/*.{ts,tsx}` for class scanning.
- **Vite alias `@shared`**: resolves to `../shared/src` in both apps' `vite.config.ts`.
- **Tauri stub**: `shared/src/types/tauri-api-stub.d.ts` provides `@tauri-apps/api/core` types without requiring the package. Web build externalizes it via `rollupOptions.external`.

## Dev Commands

```bash
# Install root deps first (required for shared/ module resolution)
npm install

# Web app (client on :5173, Express server on :3001)
cd web-app && npm install && npm run dev

# Desktop app (requires Rust + Tauri CLI)
cd desktop-app && npm install && npm run dev

# Build
cd web-app && npm run build
cd desktop-app && npm run build

# Lint (per app, no root-level lint)
cd web-app && npm run lint
cd desktop-app && npm run lint
```

No `tsc` typecheck step — `tsc -b` was removed from build scripts because `shared/` sits outside each project and tsc can't resolve cross-project modules. Vite handles this correctly via the alias.

## Testing

No test framework is configured. `playwright` is listed as a dependency in `web-app/package.json` but no test files exist yet.

## Server

- Express 5 backend at `web-app/server/index.js` (CommonJS, port 3001)
- Server has its own `package.json` and `node_modules` inside `web-app/server/`
- Dev mode starts both client and server via `npm-run-all2`: `run-p dev:client dev:server`
- Data stored as JSON files in `web-app/app-data/` (gitignored, contains API keys)
- Markdown reports written to `reports/` at repo root (gitignored)

## Shared Prompts & Templates

**`shared/prompts/`** and **`shared/templates/`** are the single source of truth for all LLM system prompts and markdown report templates. Both backends read from these shared files.

- **`shared/prompts/`**: Plain `.txt` files, one per prompt type (morning-plan, daily-report, weekly-report, monthly-report, test)
- **`shared/templates/`**: `.json` files defining markdown report structure (section headings, table columns, empty row placeholders, labels)
- **Web backend** (`web-app/server/index.js`): Reads files at runtime via `fs.readFileSync()` using `loadPrompt()` and `loadTemplate()`
- **Tauri backend** (`desktop-app/src-tauri/src/commands/`): Embeds at compile time via `include_str!()` macro

**To modify a prompt or report structure, edit `shared/prompts/` or `shared/templates/` only — both backends will pick up the change automatically.**

## Design System

See `DESIGN_GUIDELINE.md` for the full "专注流" (Focus Flow) spec. Key constraints:
- Primary color: `#1E3A5F` (deep sea blue). Buttons, nav bar.
- Purple is banned — all former purple usages replaced with `#3B82F6` (blue) or `#1E3A5F`.
- AI-related UI uses `#3B82F6` blue, not purple.
- Priority gradient: P0 `#DC2626` → P1 `#EA580C` → P2 `#EAB308` → P3 `#9CA3AF`.
- Icons: Lucide React only. AI buttons use `Sparkles`.
- All colors use hex values or Tailwind arbitrary values (e.g. `bg-[#1e3a5f]`), not Tailwind named colors.

## AI Skill

`work-report-generator/` contains an OpenCode skill for generating reports (morning plan → daily → weekly → monthly) based on GTD+STAR+PDCA framework. See `work-report-generator/SKILL.md`.

## Gotchas

- `shared/pages/` (empty) is a leftover from the v2.0 refactor — the real pages are in `shared/src/pages/`.
- `web-app/app-data/` contains `llm-config.json` with API keys — never commit or log.
- The Express server imports `openai` dynamically (`await import('openai')`) to support streaming SSE responses.
- Web build must externalize `@tauri-apps/api/core` or it will fail at build time.
