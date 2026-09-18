import re

with open('src/lib/tree-store.ts', 'r') as f:
    content = f.read()

# Add bulkAddPaths type to TreeState interface
if 'bulkAddPaths: (pathsText: string) => void' not in content:
    content = content.replace(
        "applyAiTree: (rootName: string, nodes: AiNodeDTO[], isImport?: boolean) => void",
        "applyAiTree: (rootName: string, nodes: AiNodeDTO[], isImport?: boolean) => void\n  bulkAddPaths: (pathsText: string) => void"
    )

# Add bulkAddPaths implementation
bulk_add_impl = """
  bulkAddPaths: (pathsText) => {
    const lines = pathsText.split('\\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) return

    set((state) => {
      const nodes = deepClone(state.nodes)

      for (const line of lines) {
        const parts = line.split(/[\\\\/]/).filter(p => p.length > 0)
        if (parts.length === 0) continue

        let currentLevel = nodes
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i]
          const isFile = i === parts.length - 1 && (!part.endsWith('/') && part.includes('.')) // Very simple heuristic, assume last part with dot is file unless it ends with /

          let existing = currentLevel.find(n => n.name === part)

          if (!existing) {
            existing = isFile ? createFile(part) : createFolder(part)
            currentLevel.push(existing)
          } else if (isFile && existing.type === 'folder') {
            // Already a folder with this name, we can't make it a file
          }

          if (existing.type === 'folder') {
            existing.isExpanded = true
            currentLevel = existing.children
          }
        }
      }

      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history]
      newHistory.push({ nodes: deepClone(nodes), rootName: state.rootName })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()

      return { nodes, history: newHistory, historyIndex: newHistory.length - 1 }
    })
  },
"""

if 'bulkAddPaths: (pathsText) => {' not in content:
    content = content.replace(
        "applyAiTree: (newRootName, dtoNodes, isImport) => {",
        bulk_add_impl + "\n  applyAiTree: (newRootName, dtoNodes, isImport) => {"
    )

with open('src/lib/tree-store.ts', 'w') as f:
    f.write(content)
