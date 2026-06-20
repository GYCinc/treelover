# AGENTS.md — Tree Architect

## Project Overview

**Tree Architect** is a visual folder structure builder with a Fallout/CRT terminal aesthetic. Users build directory trees, then export them as ASCII tree text, shell `mkdir` commands, JSON, or a bash reorganization script. An AI assistant can also modify tree structures via natural language prompts.

The project currently ships two independent user interfaces:

1. **Web app** — implemented with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, and Zustand.
2. **Terminal UI** — implemented in Go with Bubble Tea + Lip Gloss in `tui/`.

Core runtime: Bun for the web app, Go for the TUI. Prisma + SQLite are present but unused by the app itself.

---

## Quick Start

### Web app

```bash
# 1. Install dependencies
bun install

# 2. Push the (unused) Prisma schema
bun run db:push

# 3. Start the dev server on http://localhost:3000
bun run dev
```

Or use the bootstrap script:

```bash
.zscripts/dev.sh
```

### Terminal UI

```bash
cd tui
go run .
```

Or run the pre-built binary:

```bash
cd tui
./tree-architect
```

---

## Essential Commands

| Command | Purpose |
|---------|---------|
| `bun install` | Install web app dependencies |
| `bun run dev` | Start web dev server on port 3000 (logs to `dev.log`) |
| `bun run build` | Build web app standalone output and copy static/public into `.next/standalone/` |
| `bun run start` | Run web production server from `.next/standalone/server.js` |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to SQLite DB |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma migrations in dev |
| `bun run db:reset` | Reset database |
| `bun run scripts/scan-dir.ts <path>` | Scan a directory and output tree JSON for import |
| `.zscripts/dev.sh` | Full dev bootstrap: install, db:push, start dev server, health check, auto-start any `mini-services/*` subprojects |
| `.zscripts/build.sh` | Production build script (see gotchas — hardcoded path) |
| `.zscripts/start.sh` | Production startup script: starts Next.js standalone as the foreground process |
| `cd tui && go run .` | Run the terminal UI |
| `cd tui && go test ./...` | Run TUI Go tests |
| `cd tui && go build -o tree-architect .` | Build TUI binary |

**Runtime requirement:** `bun` for the web app; `go` for the TUI. Web scripts use `bun`, not `npm` or `pnpm`.

---

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Main Tree Architect UI (client component, ~760 lines)
│   │   ├── layout.tsx          # Root layout with Geist fonts, Toaster
│   │   ├── globals.css         # Tailwind v4 imports + CRT effects + Fallout color palette
│   │   └── api/
│   │       ├── route.ts             # Health check: GET /api → { message: "Hello, world!" }
│   │       ├── ai/
│   │       │   └── route.ts         # POST /api/ai — single-agent DeepSeek call (legacy)
│   │       ├── orchestrate/
│   │       │   └── route.ts         # POST /api/orchestrate — 3-agent parallel delegation
│   │       └── generate-script/
│   │           └── route.ts         # POST /api/generate-script — tree → bash reorganization script
│   ├── components/ui/          # shadcn/ui components (50+ Radix-based primitives)
│   ├── hooks/                  # use-mobile.ts, use-toast.ts
│   └── lib/
│       ├── tree-store.ts       # Zustand store: tree data model, CRUD, history, templates, AI import
│       ├── db.ts               # PrismaClient singleton with global reuse for dev
│       └── utils.ts            # `cn()` helper (clsx + tailwind-merge)
├── prisma/
│   ├── schema.prisma           # SQLite schema: User, Post models (minimal boilerplate)
│   └── db/custom.db            # SQLite database file
├── db/custom.db                # Copy of Prisma DB used by build scripts
├── public/                     # Static assets (logo.svg, robots.txt)
├── scripts/
│   └── scan-dir.ts             # Walks a directory, outputs tree JSON for import
├── .zscripts/                  # Build/dev/deploy shell scripts
├── mini-services/              # Extensible subservice directory (currently empty .gitkeep)
├── tui/                        # Go Bubble Tea terminal UI (independent from web app)
│   ├── model.go                # Bubble Tea model/update/view and `main()` entry point
│   ├── tree.go                 # Tree data model and operations
│   ├── templates.go            # Project templates
│   ├── styles.go               # Lip Gloss styles
│   ├── tui_test.go             # Go tests
│   └── tree-architect          # Pre-built binary
├── download/                   # Generated/downloaded files
├── upload/                     # Uploaded markdown files
├── skills/                     # Crush/Claude skill definitions (large directory)
├── components.json             # shadcn/ui config (new-york style, rsc, tsx)
├── tailwind.config.ts          # Leftover Tailwind v3 config (ignored by v4 build)
├── postcss.config.mjs          # Tailwind v4 PostCSS plugin
└── next.config.ts              # output: "standalone", ignoreBuildErrors: true, reactStrictMode: false
```

---

## Architecture & Data Flow

### State Management
- **All tree state lives in Zustand** (`src/lib/tree-store.ts`). There is no server-side state for tree operations.
- The store manages: `rootName`, `nodes[]`, `selectedId`, `editingId`, `movingId`, plus undo/redo history (max 50 entries).
- Tree mutations (add, delete, rename, move, drag-drop) all go through `useTreeStore` actions and trigger a history snapshot.

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
- IDs are **not stable across sessions** (counter resets on reload). The app has no persistent backend for trees.
- The `page.tsx` renders a recursive `DraggableTreeNodeRow` component inline (not a separate file).

### Import from Real File System
Two ways to import an existing directory:
1. **Browser Native File System API** — Click "SELECT FOLDER" in the UI. Uses `window.showDirectoryPicker()` to recursively scan the chosen directory and import its structure into the tree store. Requires Chrome/Edge. Hidden files (starting with `.`) are skipped except `.github` and `.vscode`.
2. **CLI scanner** — `bun run scripts/scan-dir.ts /path/to/folder` outputs JSON. Copy/paste into the IMPORT textarea.

### Export Formats
Three formats are generated from the tree state in `tree-store.ts`:
1. **tree** — ASCII tree text (`generateFullTreeText`)
2. **mkdir** — Shell mkdir/touch commands (`generateMkdirCommands`)
3. **json** — Nested JSON structure (`generateJsonStructure`)

The UI also exposes a **Script** button that calls `/api/generate-script` and downloads a bash reorganization script directly; selecting the "Script" export format in the toggle still renders the ASCII tree text in the output panel.

### AI Integration

**Single-agent endpoint (legacy):**
- `POST /api/ai` receives `{ tree, rootName, prompt }`, sends it to DeepSeek API via `fetch`, and returns `{ rootName, nodes }`.

**Multi-agent orchestration (default UI path):**
- `POST /api/orchestrate` runs three DeepSeek agents in parallel:
  1. **analyzer** — identifies structural problems, anti-patterns, missing standard folders
  2. **architect** — produces a modified tree JSON
  3. **verifier** — checks for data loss risks, returns `{ safe: boolean, issues: string[], confidence: number }`
- Response: `{ analysis: string, proposed: { rootName, nodes }, verification: { safe, issues, confidence }, meta: { analyzerConfidence, architectConfidence, verifierConfidence } }`
- The UI shows all three outputs in a panel and lets the user **apply** the proposed tree or **dismiss** it.

**Script generation:**
- `POST /api/generate-script` receives `{ rootName, nodes, sourcePath? }` and returns a bash reorganization script.
- The script includes: dry-run preview, user confirmation prompt, `mkdir -p` for folders, `mv` for files (with missing-file guards), and cleanup of empty source directories.
- Response: `{ script: string, filename: string }`
- The UI offers a "SCRIPT" button that downloads the `.sh` file directly.

All AI endpoints use **DeepSeek API** via native `fetch` — no extra SDK dependency.
- Endpoint: `https://api.deepseek.com/v1/chat/completions`, model: `deepseek-chat`.
- Requires `DEEPSEEK_API_KEY` environment variable.
- All endpoints strip markdown code fences from model responses before JSON parsing.

### Database
- Prisma with SQLite. Connection string in `.env`: `DATABASE_URL=file:./db/custom.db`
- The Prisma schema defines `User` and `Post` models but **the app does not use them**. DB is essentially unused boilerplate.
- `src/lib/db.ts` creates a singleton PrismaClient with `log: ['query']`.

---

## Terminal UI (tui/)

The TUI is a standalone Go application that mirrors the web app's core features. It does **not** share code with the Next.js app and does **not** require the web server.

- Run: `cd tui && go run .`
- Build: `cd tui && go build -o tree-architect .`
- Test: `cd tui && go test ./...`

Features: splash screen, keyboard navigation, add/rename/delete/duplicate/move nodes, expand/collapse, undo/redo (50 entries), templates, import ASCII tree text, export to tree/mkdir/JSON, directory scan, clipboard copy, file save.

Templates match the web app: Next.js App, Python Project, React Library, Go Service, Generic Project, LLM Wiki, Weekly Calendar.

---

## Conventions & Patterns

### shadcn/ui Components
- All UI primitives are in `src/components/ui/`, generated via shadcn CLI (new-york style).
- Components use `cn()` from `@/lib/utils` for conditional classes.
- Pattern: `class-variance-authority` (cva) for variant props (see `button.tsx`).
- Radix UI primitives are imported directly (e.g., `@radix-ui/react-slot`).

### Styling
- **Tailwind CSS v4** with `@import "tailwindcss"` syntax in `src/app/globals.css` (not v3 plugin style).
- `postcss.config.mjs` uses `@tailwindcss/postcss` (v4).
- Custom `@theme inline` block in `globals.css` maps CSS variables to Tailwind theme keys.
- **Fallout terminal aesthetic:** green (`#3aff3a`) and amber (`#ffb347`) palette on near-black backgrounds.
- Custom CSS classes for CRT effects: `.crt-flicker`, `.crt-scanlines`, `.crt-scanline-bar`, `.crt-vignette`, `.patina-grid`, `.glow-green`, `.glow-amber`, `.terminal-border`, `.terminal-border-amber`.
- **Global `font-family` override:** `body` uses `'Courier New', Courier, monospace` via `globals.css` `@layer base`, not Geist.
- Many inline arbitrary Tailwind values for glows/borders (e.g., `shadow-[0_0_12px_rgba(255,179,71,0.3)]`).

### Component Patterns
- Main page is a single large `'use client'` file (`src/app/page.tsx`) with multiple inner components (`DraggableTreeNodeRow`, `DragOverlayContent`, `RootDropZone`, `StatsBar`).
- Keyboard shortcuts are registered via `useEffect` + `window.addEventListener('keydown')` in the page component (Ctrl/Cmd+Z for undo, Ctrl/Cmd+Y or Shift+Ctrl/Cmd+Z for redo).
- Drag-and-drop uses `@dnd-kit/core` with `PointerSensor` (activation constraint: 5px distance).

---

## Build & Deployment

### Standalone Build
`next.config.ts` sets `output: "standalone"`. The build script does extra manual copying:
```bash
next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
```

### Production Deployment Flow
1. `.zscripts/build.sh`:
   - Installs deps, builds Next.js standalone
   - Builds any `mini-services/*` subservices (auto-detected via `package.json` with `"dev"` script)
   - Copies `.next/standalone`, `public`, `db/custom.db`
   - Runs `db:push` against the copied DB
   - Packages everything into `/tmp/build_fullstack_$BUILD_ID.tar.gz`

2. `.zscripts/start.sh`:
   - Sets `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`
   - Defaults `DATABASE_URL=file:/app/db/custom.db`
   - Runs `bun server.js` as the **foreground** process
   - Graceful shutdown on SIGTERM/SIGINT

---

## Important Gotchas

### TypeScript / Build
- `next.config.ts` has `typescript.ignoreBuildErrors: true` — TypeScript errors **do not block builds**.
- `tsconfig.json` has `noImplicitAny: false`.
- `reactStrictMode: false` in `next.config.ts`.

### ESLint
- `eslint.config.mjs` is **extremely permissive** — nearly all rules are turned off:
  - `@typescript-eslint/no-explicit-any: off`
  - `@typescript-eslint/no-unused-vars: off`
  - `react-hooks/exhaustive-deps: off`
  - `no-console: off`, `no-debugger: off`, `no-unused-vars: off`
  - Plus many others
- **Do not rely on ESLint to catch bugs.** Lint will pass even with obvious issues.
- ESLint ignores `examples/**` and `skills/`.

### Tailwind Config Mismatch
- `tailwind.config.ts` is a **leftover Tailwind v3 config** and is effectively ignored by the v4 build.
- Its `content` paths (`./pages`, `./components`, `./app`) are also wrong for this project (`src/app`, `src/components`).
- The active styling system is entirely in `src/app/globals.css` (`@import "tailwindcss"`, `@theme inline`, `@layer base`).

### State & IDs
- Tree node IDs are generated with a module-level counter (`let _idCounter = 0`). This means:
  - IDs are **not unique across sessions** (counter resets on page reload).
  - Duplicating a node calls `cloneWithNewIds` which bumps the same counter.
  - There is **no server persistence** for tree data; everything is in-memory.

### Database
- The SQLite DB and Prisma schema exist but are **not used by the app**. The `User` and `Post` models are boilerplate. Don't assume adding a tree persistence feature requires only a schema change — there's no DB integration in the UI layer.

### AI Environment Variable
- `.env` currently contains a real `DEEPSEEK_API_KEY`. The file is tracked in git despite `.gitignore` listing `.env*`. Do not expose or commit this key in shared outputs.

### Build Script Hardcoded Path
- `.zscripts/build.sh` has `NEXTJS_PROJECT_DIR="/home/z/my-project"` hardcoded at the top. It must be edited to point at this repository before production builds work.

### mini-services
- `mini-services/` is an extension point. The dev/build/start scripts scan it and auto-start any subdirectories containing a `package.json` with a `"dev"` script.
- Currently empty (only `.gitkeep`).

### Testing
- **No frontend test suite exists.** The only tests are Go tests in `tui/tui_test.go`.

### skills/ Directory
- `.gitignore` lists `/skills/` but the directory is already tracked in git and contains many skill definitions. Be aware of this inconsistency when adding new skills.

---

## File Ownership Summary

| File | What It Controls |
|------|------------------|
| `src/lib/tree-store.ts` | All web app tree data logic, templates, export generators, undo/redo |
| `src/app/page.tsx` | Entire web UI: tree renderer, toolbar, import/export, AI prompt, keyboard shortcuts |
| `src/app/api/ai/route.ts` | Legacy single-agent AI backend |
| `src/app/api/orchestrate/route.ts` | Multi-agent AI backend |
| `src/app/api/generate-script/route.ts` | Bash script generator backend |
| `src/app/globals.css` | Color palette, CRT effects, font override — **critical for visual identity** |
| `tui/*.go` | Independent terminal UI |
| `.zscripts/build.sh` | Production build orchestration (hardcoded path) |
| `.zscripts/start.sh` | Production startup orchestration |
