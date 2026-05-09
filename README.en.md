# Clarify Work

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-2.1.0-blue)](./package.json)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Desktop-1E3A5F)](./)
[![English](https://img.shields.io/badge/Lang-English-blue)](./README.en.md) [![中文](https://img.shields.io/badge/语言-中文-lightgrey)](./README.md)

**Daily-cycle work management system** based on **GTD + STAR + PDCA** hybrid framework. Built for roles with iterative task-driven + ad-hoc task mix (e.g., software testing, project management).

Designed around a **daily loop**: morning planning inherits yesterday's leftovers, evening reports capture outcomes, and weekly/monthly reports aggregate upward — forming a closed feedback loop.

> 🌊 「专注流」Design System — Deep sea blue primary color, warm priority gradient, built for long-hour productivity use.

---

## Why Clarify Work?

### A Proven Methodology, Not Just a Todo App

Traditional todo apps treat tasks in isolation. Clarify Work implements a **daily cycle** rooted in three established frameworks:

- **GTD** (Getting Things Done) — Capture, clarify, organize tasks with priority-driven kanban
- **STAR** (Situation-Task-Action-Result) — Structure weekly/monthly reports around measurable outcomes
- **PDCA** (Plan-Do-Check-Act) — Continuous improvement loop at daily and weekly granularity

### One Codebase, Two Platforms

Shared frontend source in `shared/src/` — modify once, both Web and Desktop apps update automatically. Runtime `isTauri` detection switches API adapters transparently.

---

## Features

| Feature | Description | Framework |
|---------|-------------|-----------|
| **Kanban Board** | Main/side task boards with priority sorting & drag management | GTD |
| **Morning Plan** | Auto-inherits yesterday's leftovers, AI-assisted daily arrangement | GTD |
| **Daily Report** | Record execution process + PDCA review, AI-assisted generation | GTD + PDCA |
| **Weekly Report** | Aggregate daily reports, STAR outcome presentation, PDCA weekly review | PDCA + STAR |
| **Monthly Report** | Aggregate weekly reports, group by iteration version, upward reporting | STAR |
| **AI Assistant** | OpenAI-compatible API integration, streaming report generation | — |

## Daily Loop

```
Yesterday's Report ──→ Morning Plan ──→ Daily Execution ──→ Evening Report ──→ Tomorrow's Plan
   (leftover tasks)    (today's plan)    (execute per plan)   (outcome record)     (closed loop)
```

**Data flows across levels:**

```
Daily Done      → Weekly STAR achievements
Daily Waiting   → Weekly blocker tracking
Daily Check/Act → Weekly PDCA review
Weekly STAR     → Monthly iteration grouping
Weekly Stats    → Monthly trend analysis
Monthly Act     → Next month's morning plan (loop closed)
```

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- Install root dependencies first (required for `shared/` module resolution):

```bash
npm install
```

### Web App

```bash
cd web-app
npm install
npm run dev
```

Frontend: http://localhost:5173 | Backend API: http://localhost:3001

### Desktop App (requires Rust + Tauri CLI)

```bash
cd desktop-app
npm install
npm run dev
```

See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for setup.

### Configure AI Service

1. Open the app → **Settings** page
2. Fill in API config:
   - **Provider**: OpenAI-compatible endpoint
   - **API Key**: Your key
   - **Base URL**: API address (default `https://api.openai.com/v1`)
   - **Model**: Model name (default `gpt-4o-mini`)
3. Click **Test Connection** to verify

---

## Tech Stack

| Layer | Web App | Desktop App |
|-------|---------|-------------|
| Frontend | React 19 + TypeScript | React 19 + TypeScript |
| Shared Source | `shared/src/` (Vite alias `@shared`) | Same |
| Build | Vite 8 | Vite 8 |
| CSS | Tailwind CSS 4 | Tailwind CSS 4 |
| Icons | Lucide React | Lucide React |
| Routing | React Router DOM 7 | React Router DOM 7 |
| Backend | Express 5 + Node.js | Tauri 2 + Rust |
| AI | OpenAI SDK (streaming) | Same API |
| Storage | JSON files | JSON files |

---

## Project Structure

```
clarify-work/
├── shared/                     # Single source of truth for all frontend code
│   ├── src/
│   │   ├── api/                # API layer (runtime adapter switching)
│   │   │   ├── index.ts        # Namespace Proxy export + dynamic loading
│   │   │   ├── types.ts        # API interface definitions
│   │   │   ├── web-adapter.ts  # HTTP fetch implementation
│   │   │   └── tauri-adapter.ts# Tauri invoke() implementation
│   │   ├── components/         # Shared components
│   │   ├── pages/              # Page components
│   │   ├── types/              # TypeScript types + Tauri API stub
│   │   ├── utils/              # Utility functions
│   │   ├── prompts/            # LLM system prompts (shared)
│   │   ├── templates/          # Report templates (shared)
│   │   ├── App.tsx             # Unified router
│   │   └── index.css           # Global styles
│   └── prompts/                # Prompt source files (.txt)
│   └── templates/              # Template source files (.json)
├── web-app/                    # Web shell (React + Vite + Express)
│   ├── src/main.tsx            # Entry point
│   ├── server/                 # Express backend
│   └── vite.config.ts          # Vite alias + proxy
├── desktop-app/                # Desktop shell (React + Vite + Tauri)
│   ├── src/main.tsx            # Entry point
│   └── src-tauri/              # Tauri/Rust backend
├── docs/                       # Documentation
│   ├── DESIGN_GUIDELINE.md     # 「专注流」 design specification
│   └── color-palette-showcase.html  # Color palette visualization
├── LICENSE                     # MIT License
└── package.json                # Root dependencies (shared module resolution)
```

### Architecture Highlights

- **API adapter switching**: `shared/src/api/index.ts` detects `isTauri` at runtime to dynamically load `web-adapter.ts` or `tauri-adapter.ts`. Call `initAPI()` before any API usage (done in `main.tsx`).
- **Tailwind CSS split**: `@import "tailwindcss"` lives in each app's `index.css`, not in `shared/`. The `@source` directive points Vite at `shared/src/**/*.{ts,tsx}` for class scanning.
- **Tauri stub**: `shared/src/types/tauri-api-stub.d.ts` provides `@tauri-apps/api/core` types without requiring the package. Web build externalizes it via `rollupOptions.external`.

---

## Design System

The 「专注流」(Focus Flow) design system is built for long-hour productivity use:

- **Primary**: `#1E3A5F` (deep sea blue) — nav bar, primary buttons
- **Priority gradient**: P0 `#DC2626` → P1 `#EA580C` → P2 `#EAB308` → P3 `#9CA3AF`
- **Functional colors**: Success `#10B981` / Warning `#F97316` / Danger `#EF4444` / Info `#3B82F6`
- **No purple** — all former purple usages replaced with `#3B82F6` or `#1E3A5F`

Full specification: [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md)
Color palette preview: [docs/color-palette-showcase.html](./docs/color-palette-showcase.html)

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. Create a **feature branch**: `git checkout -b feature/your-feature`
3. Make your changes in `shared/src/` (both platforms update automatically)
4. Follow the design system in [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md)
5. **Test** both platforms: `cd web-app && npm run dev` and `cd desktop-app && npm run dev`
6. Submit a **Pull Request**

### Code Conventions

- All frontend code lives in `shared/src/` — never duplicate between `web-app/` and `desktop-app/`
- Use hex colors or Tailwind arbitrary values (e.g. `bg-[#1e3a5f]`), not Tailwind named colors
- Icons: Lucide React only. AI buttons use `Sparkles`
- No test framework is configured yet — manual testing on both platforms is appreciated

---

## Report Directory Structure

Generated reports are saved as Markdown files:

```
reports/YYYY/MM/
├── daily/
│   ├── YYYY-MM-DD-plan.md    # Morning plan
│   └── YYYY-MM-DD.md         # Daily report
├── weekly/
│   └── YYYY-MM-DD.md         # Weekly report
└── YYYY-MM.md                 # Monthly report
```

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

<p align="center">
  Built with ❤️ using React, Tauri, and the GTD + STAR + PDCA framework
</p>
