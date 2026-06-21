# EFL Student Track Template & Transition Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the EFL Student Track template into Web and TUI interfaces, and implement an ID-preserving directory transition script generator for local filesystem reorganization.

**Architecture:** We will update the Zustand tree store to capture an `originalSnapshot` of scanned/imported folders. Manual and AI-proposed modifications will preserve unique node IDs (via a new name-and-path matching algorithm for AI applications). When generating scripts, the backend will match files by ID to produce precise move/rename operations, touch newly added files, and list deleted files as comments.

**Tech Stack:** Next.js (TypeScript), Zustand, Bun, Go

## Global Constraints
- Do not break existing template structures.
- Keep the generated bash script safe: never perform destructive deletions without a user-facing comment and print warnings if files are missing.
- Ensure all tests continue to pass.

---

### Task 1: Web App Template Integration

**Files:**
- Modify: `src/lib/tree-store.ts:181-244`

**Interfaces:**
- Consumes: `ProjectTemplate` and template list structure from `src/lib/tree-store.ts`
- Produces: Added `efl-student` template to the `TEMPLATES` exported list

- [ ] **Step 1: Write template integration in `src/lib/tree-store.ts`**

Modify `src/lib/tree-store.ts` to add the `efl-student` template into the `TEMPLATES` array:

```typescript
  {
    id: 'efl-student',
    name: 'EFL Student Track',
    description: 'Track and organize private English lessons for an EFL student',
    rootName: 'student-track',
    nodes: [
      createFile('00_student_folder_topography.toml'),
      createFile('01_student_context.toml'),
      createFile('02_do_and_dont.md'),
      createFile('AGENTS.md'),
      createFile('ingestion_manifest.json'),
      createFolder('W01', [
        createFile('the_weekly_vibes.html'),
        createFolder('C01', [
          createFolder('artifacts', [
            createFile('C01_MM-DD-YYYY_perfect_tense_refresh.md'),
            createFile('C01_MM-DD-YYYY_KWL_Chart.html'),
            createFile('AGENTS.md'),
          ]),
          createFolder('observations', [
            createFile('C01_MM-DD-YYYY_asset_log.md'),
            createFile('C01_MM-DD-YYYY_asset_log.html'),
            createFile('AGENTS.md'),
          ]),
        ]),
        createFolder('C02', [
          createFolder('artifacts', [
            createFile('AGENTS.md'),
          ]),
          createFolder('observations'),
        ]),
        createFolder('artifacts', [
          createFile('AGENTS.md'),
          createFile('MM-DD-YYYY_prep.md'),
        ]),
        createFolder('observations'),
      ]),
      createFolder('W02', [
        createFile('the_weekly_vibes.html'),
      ]),
    ],
  },
```

- [ ] **Step 2: Verify lint passes**

Run: `bun run lint`
Expected: Success with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/tree-store.ts
git commit -m "feat: integrate EFL student track template to web templates list"
```

---

### Task 2: TUI Template Integration

**Files:**
- Modify: `tui/templates.go:11-30`
- Test: `tui/tui_test.go`

**Interfaces:**
- Consumes: TUI template list structures in Go
- Produces: Appended `efl-student` Go Template object to the `templates` slice

- [ ] **Step 1: Write TUI template integration in `tui/templates.go`**

Add the template to `var templates = []Template{` in `tui/templates.go`:

```go
	{
		ID: "efl-student", Name: "EFL Student Track", Description: "Track and organize private English lessons for an EFL student",
		RootName: "student-track",
		Nodes: []TreeNode{
			newFile("00_student_folder_topography.toml"),
			newFile("01_student_context.toml"),
			newFile("02_do_and_dont.md"),
			newFile("AGENTS.md"),
			newFile("ingestion_manifest.json"),
			newFolder("W01",
				newFile("the_weekly_vibes.html"),
				newFolder("C01",
					newFolder("artifacts", newFile("C01_MM-DD-YYYY_perfect_tense_refresh.md"), newFile("C01_MM-DD-YYYY_KWL_Chart.html"), newFile("AGENTS.md")),
					newFolder("observations", newFile("C01_MM-DD-YYYY_asset_log.md"), newFile("C01_MM-DD-YYYY_asset_log.html"), newFile("AGENTS.md")),
				),
				newFolder("C02",
					newFolder("artifacts", newFile("AGENTS.md")),
					newFolder("observations"),
				),
				newFolder("artifacts", newFile("AGENTS.md"), newFile("MM-DD-YYYY_prep.md")),
				newFolder("observations"),
			),
			newFolder("W02",
				newFile("the_weekly_vibes.html"),
			),
		},
	},
```

- [ ] **Step 2: Run TUI Go tests**

Run: `cd tui && go test -v ./...`
Expected: Test passes successfully.

- [ ] **Step 3: Compile Go TUI binary**

Run: `cd tui && go build -o tree-architect .`
Expected: Compile completes successfully with no errors.

- [ ] **Step 4: Commit**

```bash
git add tui/templates.go
git commit -m "feat: integrate EFL student track template to TUI"
```

---

### Task 3: Store State for originalSnapshot & Heuristic ID Matching

**Files:**
- Modify: `src/lib/tree-store.ts:499-540`
- Modify: `src/lib/tree-store.ts:730-809`

**Interfaces:**
- Consumes: Node DTO structures, current tree state
- Produces: `originalSnapshot` state in `TreeState`, updated `applyAiTree` matching algorithm with ID preservation

- [ ] **Step 1: Update TreeState interface**

Add `originalSnapshot` and its signature to `TreeState` in `src/lib/tree-store.ts`:

```typescript
interface TreeState {
  originalSnapshot: { rootName: string; nodes: TreeNode[] } | null
  setRootName: (name: string) => void
  addNode: (parentId: string | null, type: 'folder' | 'file') => void
  deleteNode: (id: string) => void
  renameNode: (id: string, name: string) => void
  toggleExpand: (id: string) => void
  selectNode: (id: string | null) => void
  setEditingId: (id: string | null) => void
  moveNode: (id: string, direction: 'up' | 'down') => void
  moveNodeTo: (nodeId: string, targetParentId: string | null) => void
  duplicateNode: (id: string) => void
  setMovingId: (id: string | null) => void
  cancelMove: () => void
  importTree: (text: string) => void
  loadTemplate: (templateId: string) => void
  expandAll: () => void
  collapseAll: () => void
  clearAll: () => void
  applyAiTree: (rootName: string, nodes: AiNodeDTO[], isImport?: boolean) => void
}
```

- [ ] **Step 2: Initialize originalSnapshot in store**

Initialize `originalSnapshot: null` inside `useTreeStore`.

- [ ] **Step 3: Update `importTree` to capture the snapshot**

Modify `importTree` inside `src/lib/tree-store.ts`:

```typescript
  importTree: (text) => {
    const { rootName, nodes } = parseTreeText(text)
    const state = get()
    const newHistory = [...state.history, { nodes: deepClone(nodes), rootName }]
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    set({
      rootName,
      nodes,
      originalSnapshot: { rootName, nodes: deepClone(nodes) },
      selectedId: null,
      editingId: null,
      movingId: null,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },
```

- [ ] **Step 4: Update `loadTemplate` to clear originalSnapshot**

```typescript
  loadTemplate: (templateId) => {
    const template = TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    const nodes = template.nodes.map(n => cloneWithNewIds(n))
    const state = get()
    const newHistory = [...state.history, { nodes: deepClone(nodes), rootName: template.rootName }]
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    set({
      rootName: template.rootName,
      nodes,
      originalSnapshot: null,
      selectedId: null,
      editingId: null,
      movingId: null,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },
```

- [ ] **Step 5: Write heuristic matching function `matchDtoToTree`**

Add the helper functions before `useTreeStore`:

```typescript
interface FlattenedNode {
  id: string
  name: string
  type: 'folder' | 'file'
  path: string
}

function flattenTree(nodes: TreeNode[], currentPath: string = ''): FlattenedNode[] {
  const result: FlattenedNode[] = []
  for (const node of nodes) {
    const relativePath = currentPath ? `${currentPath}/${node.name}` : node.name
    result.push({
      id: node.id,
      name: node.name,
      type: node.type,
      path: relativePath
    })
    if (node.type === 'folder' && node.children.length > 0) {
      result.push(...flattenTree(node.children, relativePath))
    }
  }
  return result
}

function matchDtoToTree(
  dto: AiNodeDTO,
  oldFlattened: FlattenedNode[],
  claimedIds: Set<string>,
  parentPath: string = ''
): TreeNode {
  const currentPath = parentPath ? `${parentPath}/${dto.name}` : dto.name
  let matchedId: string | null = null

  // 1. Exact path match
  const exactMatch = oldFlattened.find(
    o => o.path === currentPath && o.type === dto.type && !claimedIds.has(o.id)
  )
  if (exactMatch) {
    matchedId = exactMatch.id
  } else {
    // 2. Name-based match
    const nameMatches = oldFlattened.filter(
      o => o.name.toLowerCase() === dto.name.toLowerCase() && o.type === dto.type && !claimedIds.has(o.id)
    )
    if (nameMatches.length > 0) {
      matchedId = nameMatches[0].id
    }
  }

  const id = matchedId || genId()
  if (matchedId) claimedIds.add(matchedId)

  if (dto.type === 'file') {
    return {
      id,
      name: dto.name,
      type: 'file',
      children: [],
      isExpanded: false
    }
  }

  const children = (dto.children || []).map(c =>
    matchDtoToTree(c, oldFlattened, claimedIds, currentPath)
  )

  return {
    id,
    name: dto.name,
    type: 'folder',
    children,
    isExpanded: true
  }
}
```

- [ ] **Step 6: Update `applyAiTree` to support matching**

Modify `applyAiTree` to support `isImport` parameter and node matching:

```typescript
  applyAiTree: (newRootName, dtoNodes, isImport) => {
    const state = get()
    let nodes: TreeNode[]
    
    if (isImport) {
      nodes = dtoNodes.map(n => dtoToTreeNode(n))
    } else {
      const oldFlattened = flattenTree(state.nodes)
      const claimedIds = new Set<string>()
      nodes = dtoNodes.map(n => matchDtoToTree(n, oldFlattened, claimedIds))
    }
    
    const newHistory = state.historyIndex < state.history.length - 1
      ? state.history.slice(0, state.historyIndex + 1)
      : [...state.history]
    newHistory.push({ nodes: deepClone(state.nodes), rootName: state.rootName })
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    
    set({
      rootName: newRootName || state.rootName,
      nodes,
      originalSnapshot: isImport ? { rootName: newRootName || state.rootName, nodes: deepClone(nodes) } : state.originalSnapshot,
      selectedId: null,
      editingId: null,
      movingId: null,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },
```

- [ ] **Step 7: Verify lint passes**

Run: `bun run lint`
Expected: Success with no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/tree-store.ts
git commit -m "feat: implement originalSnapshot tracking and heuristic ID-matching for AI nodes"
```

---

### Task 4: UI Scan Folder Integration and Script Generation Payload

**Files:**
- Modify: `src/app/page.tsx:356-368`
- Modify: `src/app/page.tsx:419-441`

**Interfaces:**
- Consumes: `applyAiTree` action, `originalSnapshot` state
- Produces: Correct options to `applyAiTree` on folder scan, and sends `originalSnapshot` + full `nodes` to generate script API

- [ ] **Step 1: Mark file system scan as import**

In `src/app/page.tsx`, update the `handleSelectFolder` callback to pass `true` as the third parameter to `applyAiTree`:

```typescript
  const handleSelectFolder = useCallback(async () => {
    try {
      // @ts-ignore — showDirectoryPicker is not in all TS DOM libs
      const dirHandle = await window.showDirectoryPicker()
      const scanned = await scanDirectory(dirHandle)
      applyAiTree(dirHandle.name, scanned, true) // Pass true for isImport!
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setAiError(err.message)
      }
    }
  }, [applyAiTree])
```

- [ ] **Step 2: Send originalSnapshot and nodes in script generator payload**

Update `handleGenerateScript` in `src/app/page.tsx` to retrieve `originalSnapshot` from `useTreeStore()` and pass it to `/api/generate-script`:

```typescript
  // Retrieve originalSnapshot from store hook:
  const {
    // ...
    originalSnapshot,
    // ...
  } = useTreeStore()

  // Update handleGenerateScript:
  const handleGenerateScript = useCallback(async () => {
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rootName,
          nodes, // Send full nodes (with IDs)
          originalSnapshot: originalSnapshot ? {
            rootName: originalSnapshot.rootName,
            nodes: originalSnapshot.nodes
          } : null
        }),
      })
      const data = await res.json()
      if (data.error) {
        setAiError(data.error)
        return
      }
      const blob = new Blob([data.script], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename || 'reorganize.sh'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setAiError('Failed to generate script')
    }
  }, [rootName, nodes, originalSnapshot])
```

- [ ] **Step 3: Verify lint passes**

Run: `bun run lint`
Expected: Success with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: pass originalSnapshot and full nodes to script generator endpoint"
```

---

### Task 5: Backend Script Generator Transition Logic

**Files:**
- Modify: `src/app/api/generate-script/route.ts`

**Interfaces:**
- Consumes: Post body with optional `originalSnapshot`
- Produces: Transition bash script (`reorganize.sh`) mapping files from original to new locations, touching new files, and listing deleted files

- [ ] **Step 1: Modify TreeNode interface in backend**

Update the backend interface in `src/app/api/generate-script/route.ts` to include the `id` field:

```typescript
interface TreeNode {
  id?: string
  name: string
  type: 'folder' | 'file'
  children: TreeNode[]
}
```

- [ ] **Step 2: Implement original snapshot processing and commands generation**

Modify `src/app/api/generate-script/route.ts` to implement transition commands:

```typescript
import { NextRequest, NextResponse } from 'next/server'

interface TreeNode {
  id?: string
  name: string
  type: 'folder' | 'file'
  children: TreeNode[]
}

interface ScriptRequest {
  rootName: string
  nodes: TreeNode[]
  sourcePath?: string // Original directory path
  originalSnapshot?: {
    rootName: string
    nodes: TreeNode[]
  } | null
}

function generateCommands(
  nodes: TreeNode[],
  rootName: string,
  sourcePath: string,
  currentPath: string = ''
): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    const relativePath = currentPath ? `${currentPath}/${node.name}` : node.name
    if (node.type === 'folder') {
      lines.push(`mkdir -p "${rootName}/${relativePath}"`)
      if (node.children.length > 0) {
        lines.push(...generateCommands(node.children, rootName, sourcePath, relativePath))
      }
    } else {
      const src = `${sourcePath}/${relativePath}`
      const dst = `${rootName}/${relativePath}`
      lines.push(`if [ -f "${src}" ]; then mv "${src}" "${dst}"; else echo "MISSING: ${src}"; fi`)
    }
  }
  return lines
}

function generateTransitionCommands(
  nodes: TreeNode[],
  rootName: string,
  sourcePath: string,
  origPathMap: Map<string, string>,
  currentPath: string = ''
): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    const relativePath = currentPath ? `${currentPath}/${node.name}` : node.name

    if (node.type === 'folder') {
      lines.push(`mkdir -p "${rootName}/${relativePath}"`)
      if (node.children.length > 0) {
        lines.push(...generateTransitionCommands(node.children, rootName, sourcePath, origPathMap, relativePath))
      }
    } else {
      const dst = `${rootName}/${relativePath}`
      const origPath = node.id ? origPathMap.get(node.id) : null
      if (origPath) {
        const src = `${sourcePath}/${origPath}`
        lines.push(`if [ -f "${src}" ]; then mv "${src}" "${dst}"; else echo "MISSING: ${src}"; fi`)
      } else {
        lines.push(`touch "${dst}"`)
      }
    }
  }
  return lines
}

function generateCleanup(
  nodes: TreeNode[],
  sourcePath: string,
  currentPath: string = ''
): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    const relativePath = currentPath ? `${currentPath}/${node.name}` : node.name
    const fullPath = `${sourcePath}/${relativePath}`

    if (node.type === 'folder') {
      if (node.children.length > 0) {
        lines.push(...generateCleanup(node.children, sourcePath, relativePath))
      }
      lines.push(`rmdir "${fullPath}" 2>/dev/null || true`)
    }
  }
  return lines
}

function generateDryRun(
  nodes: TreeNode[],
  rootName: string,
  currentPath: string = '',
  prefix: string = ''
): string[].
...
```

- [ ] **Step 3: Run typescript compiler check / dev server test**

Run: `bun run build`
Expected: Next.js standalone build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/generate-script/route.ts
git commit -m "feat: implement backend mapping and transition bash script generator with deleted logs"
```
