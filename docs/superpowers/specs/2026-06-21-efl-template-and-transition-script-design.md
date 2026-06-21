# Spec: EFL Student Track Template & ID-Preserving Transition Script

This specification outlines the integration of the custom EFL Student Track template and the implementation of an ID-preserving directory transition script generator for local folder restructuring.

---

## 1. EFL Student Track Template

We will integrate the custom EFL Student Track template into the system's template database.

### Web Store Configuration (`src/lib/tree-store.ts`)
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
}
```

### TUI Configuration (`tui/templates.go`)
We will add an identical struct definition to the TUI's `templates` list so it behaves identically in the command-line interface.

---

## 2. ID-Preserving Transition Script Generator

To generate deterministic transition scripts for reorganizing directories on disk, we will compare the state of the original filesystem snapshot with the modified editor state.

### A. Store Architecture Changes (`src/lib/tree-store.ts`)
* Add `originalSnapshot: { rootName: string; nodes: TreeNode[] } | null` to the Zustand store.
* When importing/scanning a folder (fresh import):
  * Store the imported layout in `originalSnapshot`.
  * Set unique IDs for the nodes (`node-1`, `node-2`, etc.).
* When loading a template or clearing all:
  * Clear `originalSnapshot` to `null`.
* When applying AI proposed changes:
  * Run a matching heuristic (`matchDtoToTree`) to map AI nodes back to the existing nodes, preserving the matching node IDs so the move/rename history is not lost.

### B. Heuristic Node ID Matching Algorithm
```typescript
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
    // 2. Case-insensitive name match (to match renamed/moved files)
    const nameMatches = oldFlattened.filter(
      o => o.name.toLowerCase() === dto.name.toLowerCase() && o.type === dto.type && !claimedIds.has(o.id)
    )
    if (nameMatches.length > 0) {
      matchedId = nameMatches[0].id
    }
  }

  const id = matchedId || genId()
  if (matchedId) claimedIds.add(matchedId)

  return dto.type === 'file'
    ? { id, name: dto.name, type: 'file', children: [], isExpanded: false }
    : { id, name: dto.name, type: 'folder', children: (dto.children || []).map(c => matchDtoToTree(c, oldFlattened, claimedIds, currentPath)), isExpanded: true }
}
```

### C. Transition Script Generation Endpoint (`/api/generate-script`)
The endpoint will accept an optional `originalSnapshot` payload.
* If **present**, the script will:
  1. Create all directories defined in the new structure (`mkdir -p`).
  2. For every file node:
     * Lookup its ID in the original snapshot path map.
     * If matched, emit: `mv "${SOURCE_PATH}/old/path.txt" "${TARGET_ROOT}/new/path.txt"`.
     * If new, emit: `touch "${TARGET_ROOT}/new/path.txt"`.
  3. Emit a list of files that were present in the snapshot but removed in the current editor state as safety comments (`# DELETED: ...`).
  4. Cleanup empty directories in the old path structure.
* If **absent**, it falls back to generating `mkdir -p` and `touch` scripts as before.
