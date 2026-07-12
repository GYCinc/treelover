# AGENTS.md — tree_Lover

## Project Overview

**tree_Lover** (branded `v.forever_Alpha`) is a visual folder structure builder. Users build directory trees, then export them as ASCII tree text, shell `mkdir` commands, JSON, or a bash reorganization script. An AI assistant can also modify tree structures via natural language prompts. The UI supports multiple color **themes** (green/amber/blue/classic/cyber-glass/nord-light/nord-dark/dracula/solarized-light) and structural **skins** (terminal CRT, modern rounded SaaS, chalkboard) that can be mixed independently.

The project ships two independent user interfaces:

1. **Web app** — Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, Zod.
2. **Terminal UI** — Go with Bubble Tea + Lip Gloss in `tui/`.

Core runtime: **Bun** for the web app, **Go** for the TUI. There is **no database** — all tree state is in-memory + `localStorage`.

---

## Quick Start

### Web app

```bash
bun install
bun run dev          # http://localhost:3000, logs to dev.log
```

### Terminal UI

```bash
cd tui
go run .
# or build:
go build -o tree-architect .
```

---

## Essential Commands

| Command | Purpose |
|---------|---------|
| `bun install` | Install web app dependencies |
| `bun run dev` | Start web dev server on port 3000 (logs to `dev.log`) |
| `bun run build` | Build standalone output, then copy `.next/static` and `public` into `.next/standalone/` |
| `bun run start` | Run production server from `.next/standalone/server.js` (via bun, logs to `server.log`) |
| `bun run lint` | Run ESLint (extremely permissive — see gotchas) |
| `bun run scripts/scan-dir.ts <path>` | Scan a real directory and output tree JSON for import |
| `bun run scripts/compile-tree.ts` | "Paddle compiler" — compiles a canal/lock/bridge tree model into Rust source code (easter-egg feature) |
| `cd tui && go run .` | Run the terminal UI |
| `cd tui && go test ./...` | Run TUI Go tests |
| `cd tui && go build -o tree-architect .` | Build TUI binary |

**Runtime requirement:** `bun` for the web app; `go` for the TUI. Web scripts use `bun`, not `npm` or `pnpm`.

---

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Main UI (client component, ~914 lines)
│   │   ├── layout.tsx          # Root layout: Geist + Geist Mono fonts, Toaster, metadata
│   │   ├── globals.css         # Tailwind v4 + tw-animate-css imports, multi-theme + multi-skin variables
│   │   └── api/
│   │       ├── route.ts             # GET /api → { message: "Hello, world!" }
│   │       ├── health/route.ts      # GET /api/health → { status, timestamp, uptime, env }
│   │       ├── ai/route.ts          # POST /api/ai — single-agent DeepSeek call (legacy)
│   │       ├── orchestrate/route.ts # POST /api/orchestrate — 3-agent parallel delegation
│   │       └── generate-script/route.ts # POST /api/generate-script — tree → bash script (no AI key needed)
│   ├── components/ui/          # 46 shadcn/ui components (Radix-based primitives)
│   ├── hooks/                  # use-mobile.ts, use-toast.ts
│   └── lib/
│       ├── tree-store.ts       # Zustand store: tree data, CRUD, history, templates, themes, skins, snapshots
│       └── utils.ts            # `cn()` helper (clsx + tailwind-merge)
├── tui/                        # Go Bubble Tea terminal UI (independent from web app)
│   ├── model.go                # Bubble Tea model/update/view and `main()` (~1364 lines)
│   ├── tree.go                 # Tree data model and operations
│   ├── templates.go            # Project templates (7 templates, mirroring web app)
│   ├── styles.go               # Lip Gloss styles
│   ├── tui_test.go             # Go tests
│   └── README.md               # TUI controls reference
├── scripts/
│   ├── scan-dir.ts             # Walks a directory → tree JSON for import
│   ├── compile-tree.ts         # "Paddle compiler": canal/lock tree → Rust source (DOOM easter-egg aware)
│   └── sample-canal-tree.json  # Sample input for compile-tree
├── public/                     # Static assets (logo.svg, robots.txt)
├── .github/workflows/ci.yml    # CI: lint → build (main/master)
├── components.json             # shadcn/ui config (new-york style, rsc, tsx)
├── next.config.ts              # output: "standalone", turbopack.root, ignoreBuildErrors: true, reactStrictMode: false
├── eslint.config.mjs           # Extremely permissive lint (see gotchas)
├── postcss.config.mjs          # Tailwind v4 PostCSS plugin (@tailwindcss/postcss)
└── tsconfig.json               # strict: true, noImplicitAny: false, @/* → ./src/*
```

---

## Architecture & Data Flow

### State Management
- **All tree state lives in Zustand** (`src/lib/tree-store.ts`). There is no server-side state for tree operations.
- The store manages: `rootName`, `nodes[]`, `selectedId`, `editingId`, `movingId`, `originalSnapshot`, `theme`, `skin`, `snapshots[]`, plus undo/redo history (max 50 entries).
- Tree mutations (add, delete, rename, move, drag-drop) all go through `useTreeStore` actions and trigger a history snapshot.
- **Theme + skin** are also in the store. `setTheme`/`setSkin` write to `localStorage` (`tree-theme`, `tree-skin`) and set `data-theme`/`data-skin` attributes on `document.documentElement`. CSS in `globals.css` keys off these attributes.

### Theme & Skin System (non-obvious)
- **Themes** (`data-theme`) control the color palette: `green`, `amber`, `blue`, `classic`, `cyber-glass`, `nord-light`, `nord-dark`, `dracula`, `solarized-light`. Each is a `[data-theme="X"]` block in `globals.css` defining CSS custom properties.
- **Skins** (`data-skin`) control structural/visual treatment: `terminal` (CRT scanlines, flicker, glow), `modern` (rounded SaaS flat, disables text shadows), `chalkboard` (handwritten font via 'Architects Daughter', sketched dashed borders, overrides color variables). Skins override how `.terminal-border`, `.crt-screen`, `.glow-active` render, and also set `--radius` and `--font-family`.
- Themes and skins are **independent and composable** — any theme works with any skin. Some themes (cyber-glass, nord-*, dracula, solarized-light) set `--crt-display: none` to disable CRT effects even under the terminal skin.
- On mount, the page reads `localStorage` to restore the saved theme/skin and applies the `data-*` attributes **before render** to avoid SSR hydration mismatches. `suppressHydrationWarning` is also used on the root `<html>`, the theme/skin selector, and the main panels.

### Local Snapshots
- The store supports **local snapshots** (validated with Zod `ZSnapshotSchema`): `createSnapshot(name)`, `restoreSnapshot(id)`, `deleteSnapshot(id)`.
- Snapshots persist to `localStorage` under `tree-snapshots`. They are loaded on mount (not at store init) to handle hydration.
- This is distinct from undo/redo history — snapshots are user-named save points.

### Tree Data Model
```ts
interface TreeNode {
  id: string      // generated via incrementing counter `node-${++_idCounter}`
  name: string
  type: 'folder' | 'file'
  children: TreeNode[]
  isExpanded: boolean
}
```
- IDs are **not stable across sessions** (counter resets on reload).
- The `page.tsx` renders a recursive `DraggableTreeNodeRow` component inline (not a separate file), plus `DragOverlayContent`, `RootDropZone`, and `StatsBar` inner components.
- `applyAiTree` uses path-then-name matching (`matchDtoToTree`) to reuse existing node IDs where possible, preserving identity across AI-proposed tree changes.

### Import from Real File System
Two ways to import an existing directory:
1. **Browser Native File System API** — Click "SELECT FOLDER" in the UI. Uses `window.showDirectoryPicker()` to recursively scan the chosen directory and import its structure. Requires Chrome/Edge. Hidden files (starting with `.`) are skipped except `.github` and `.vscode`.
2. **CLI scanner** — `bun run scripts/scan-dir.ts /path/to/folder` outputs JSON. Copy/paste into the IMPORT textarea.

### Export Formats
Generated from tree state in `tree-store.ts`:
1. **tree** — ASCII tree text (`generateFullTreeText`)
2. **mkdir** — Shell mkdir/touch commands (`generateMkdirCommands`)
3. **json** — Nested JSON structure (`generateJsonStructure`)

The UI also exposes a **Script** button that calls `/api/generate-script` and downloads a bash reorganization script directly.

### Templates
Seven built-in templates in `TEMPLATES` (`src/lib/tree-store.ts`): `nextjs`, `python`, `react-lib`, `go`, `generic`, `llm-wiki`, `weekly-calendar`. Templates are mirrored in the TUI (`tui/templates.go`).

### AI Integration

**Single-agent endpoint (legacy):** `POST /api/ai` receives `{ tree, rootName, prompt }`, calls DeepSeek, returns `{ rootName, nodes }`.

**Multi-agent orchestration (default UI path):** `POST /api/orchestrate` runs three DeepSeek agents in parallel via `Promise.all`:
1. **analyzer** — identifies structural problems, anti-patterns, missing standard folders
2. **architect** — produces a modified tree JSON
3. **verifier** — checks for data loss risks, returns `{ safe, issues, confidence }`
- Response includes `meta` with per-agent confidence scores. The UI shows all three outputs and lets the user **apply** or **dismiss** the proposed tree.

**Script generation:** `POST /api/generate-script` receives `{ rootName, nodes, sourcePath?, originalSnapshot? }` and returns a bash reorganization script. **This endpoint does NOT require `DEEPSEEK_API_KEY`** — it's pure logic (dry-run preview, confirmation prompt, `mkdir -p`, `mv` with missing-file guards, empty-dir cleanup via `rmdir`).

All AI endpoints use **DeepSeek API** via native `fetch` — no SDK dependency.
- Endpoint: `https://api.deepseek.com/v1/chat/completions`, model: `deepseek-chat`.
- Requires `DEEPSEEK_API_KEY` environment variable (for `/api/ai` and `/api/orchestrate` only).
- All AI endpoints strip markdown code fences from model responses before JSON parsing.

### Paddle Compiler (compile-tree.ts)
A novelty feature: `scripts/compile-tree.ts` translates a directory tree representing a UK canal system (Canals = folders, Locks = nested modules, Bridges = files with "bridge" in the name, Paddles = regular files) into native Rust source code. Includes a DOOM E1M1 easter-egg animation when a `doom` node is present. This is not part of the web app runtime — it's a standalone script.

---

## Terminal UI (tui/)

Standalone Go application mirroring the web app's core features. Does **not** share code with the Next.js app and does **not** require the web server.

- Run: `cd tui && go run .`
- Build: `cd tui && go build -o tree-architect .`
- Test: `cd tui && go test ./...`
- Module: `tree-tui`, Go 1.26.3, deps: `charmbracelet/bubbletea` v1.3.10, `charmbracelet/lipgloss` v1.1.0.

Features: splash screen, keyboard navigation, add/rename/delete/duplicate/move nodes, expand/collapse, undo/redo (50 entries), templates, import ASCII tree text, export to tree/mkdir/JSON, directory scan, clipboard copy, file save. See `tui/README.md` for the full keymap.

---

## Build & Deployment

### Standalone Build
`next.config.ts` sets `output: "standalone"` and configures `turbopack.root`. The `build` script does extra manual copying:
```bash
next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
```

### CI (.github/workflows/ci.yml)
Two jobs on push/PR to main/master:
1. **lint** — `bun install --frozen-lockfile` → `bun run lint`
2. **build** — needs lint; `bun install --frozen-lockfile` → `bun run build`

---

## Conventions & Patterns

### shadcn/ui Components
- All UI primitives in `src/components/ui/` (46 components), generated via shadcn CLI (new-york style, `components.json`).
- Components use `cn()` from `@/lib/utils` for conditional classes.
- Pattern: `class-variance-authority` (cva) for variant props (see `button.tsx`).
- Radix UI primitives imported directly (e.g., `@radix-ui/react-slot`).
- Icon library: `lucide-react`.

### Styling
- **Tailwind CSS v4** with `@import "tailwindcss"` syntax in `src/app/globals.css` (not v3 plugin style). Also imports `tw-animate-css`.
- `postcss.config.mjs` uses `@tailwindcss/postcss` (v4).
- Custom `@theme inline` block in `globals.css` maps CSS variables to Tailwind theme keys.
- **Multi-theme system:** `[data-theme="X"]` blocks define color CSS variables; `[data-skin="Y"]` blocks define structural styling. Both are toggled via store actions that set `data-*` attributes on `<html>`.
- **Global `font-family` override:** `body` uses `var(--font-family)` via `globals.css` `@layer base`, which defaults to `'Courier New', Courier, monospace` for terminal/green/amber/blue/classic themes, and `system-ui` sans-serif for modern themes. The chalkboard skin overrides to `'Architects Daughter'` (handwritten). Geist/Geist_Mono fonts are loaded in `layout.tsx` but only referenced as CSS variables, not as the body font.
- Many inline arbitrary Tailwind values for glows/borders (e.g., `shadow-[0_0_12px_rgba(255,179,71,0.3)]`).

### Component Patterns
- Main page is a single large `'use client'` file (`src/app/page.tsx`) with inner components (`DraggableTreeNodeRow`, `DragOverlayContent`, `RootDropZone`, `StatsBar`).
- Keyboard shortcuts registered via `useEffect` + `window.addEventListener('keydown')` (Ctrl/Cmd+Z undo, Ctrl/Cmd+Y or Shift+Ctrl/Cmd+Z redo).
- Drag-and-drop uses `@dnd-kit/core` with `PointerSensor` (activation constraint: 5px distance).
- Output text is memoized with `useMemo` to avoid re-render lag during drag-and-drop.
- Zod is used for snapshot validation (`ZSnapshotSchema`, `ZTreeNodeSchema`) and in the page component.

---

## Important Gotchas

### No Database
The app has **no database** — all tree data is in-memory + `localStorage` (snapshots, theme, skin). Do not re-introduce Prisma/DB code without rewiring it end-to-end; there is no DB integration in the UI layer.

### TypeScript / Build
- `next.config.ts` has `typescript.ignoreBuildErrors: true` — TypeScript errors **do not block builds**.
- `tsconfig.json` has `noImplicitAny: false` but `strict: true`.
- `reactStrictMode: false` in `next.config.ts`.

### ESLint
- `eslint.config.mjs` is **extremely permissive** — nearly all rules are turned off (`no-explicit-any`, `no-unused-vars`, `react-hooks/exhaustive-deps`, `no-console`, `no-debugger`, `no-unreachable`, etc.).
- **Do not rely on ESLint to catch bugs.** Lint will pass even with obvious issues.
- ESLint ignores `node_modules/**`, `.next/**`, `out/**`, `build/**`, `next-env.d.ts`.

### State & IDs
- Tree node IDs use a module-level counter (`let _idCounter = 0`): `node-${++_idCounter}`.
- IDs are **not unique across sessions** (counter resets on page reload).
- Duplicating a node calls `cloneWithNewIds` which bumps the same counter.
- There is **no server persistence** for tree data; everything is in-memory + `localStorage`.

### SSR Hydration
- Theme/skin are applied from `localStorage` on mount, and `data-*` attributes are set before render to avoid mismatches. `suppressHydrationWarning` is used on `<html>`, the theme/skin toolbar, and the main content panels. Don't remove these without testing for hydration errors.

### Environment Variables
- `/api/ai` and `/api/orchestrate` require `DEEPSEEK_API_KEY` to function (they return an error if unset). `/api/generate-script` does **not** need it.
- `.gitignore` ignores `.env*`. Do not commit secrets.

### Testing
- **No frontend test suite exists.** The only tests are Go tests in `tui/tui_test.go` (tree ops, export, import, move, duplicate, history, templates).
- CI runs only `bun run lint` and `bun run build` — no test step for the web app.

---

## File Ownership Summary

| File | What It Controls |
|------|------------------|
| `src/lib/tree-store.ts` | All web app tree data logic, templates, themes, skins, snapshots, export generators, undo/redo |
| `src/app/page.tsx` | Entire web UI: tree renderer, toolbar, import/export, AI prompt, theme/skin pickers, keyboard shortcuts |
| `src/app/globals.css` | Color themes, structural skins, CRT effects, font override — **critical for visual identity** |
| `src/app/layout.tsx` | Root layout: Geist font loading, metadata, Toaster |
| `src/app/api/ai/route.ts` | Legacy single-agent AI backend (needs `DEEPSEEK_API_KEY`) |
| `src/app/api/orchestrate/route.ts` | Multi-agent AI backend (needs `DEEPSEEK_API_KEY`) |
| `src/app/api/generate-script/route.ts` | Bash script generator backend (no AI key needed) |
| `src/app/api/health/route.ts` | Health check endpoint |
| `tui/*.go` | Independent terminal UI |
| `scripts/compile-tree.ts` | Paddle compiler (canal tree → Rust source, DOOM easter-egg) |
| `.github/workflows/ci.yml` | CI pipeline (lint → build) |
