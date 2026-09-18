import re

with open('src/lib/tree-store.ts', 'r') as f:
    content = f.read()

# Add flattenFolder and groupByExtension to TreeState interface
if 'flattenFolder: (id: string) => void' not in content:
    content = content.replace(
        "sortNodes: (id: string | null) => void",
        "sortNodes: (id: string | null) => void\n  flattenFolder: (id: string) => void\n  groupByExtension: (id: string) => void"
    )

flatten_impl = """
  flattenFolder: (id) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const target = findNodeById(nodes, id)

      if (!target || target.type !== 'folder') return { nodes }

      const allFiles: TreeNode[] = []
      const extractFiles = (n: TreeNode) => {
        if (n.type === 'file') {
          allFiles.push(n)
        } else if (n.type === 'folder') {
          for (const child of n.children) extractFiles(child)
        }
      }

      for (const child of target.children) {
        extractFiles(child)
      }

      target.children = allFiles

      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history]
      newHistory.push({ nodes: deepClone(nodes), rootName: state.rootName })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()

      return { nodes, history: newHistory, historyIndex: newHistory.length - 1 }
    })
  },

  groupByExtension: (id) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const target = findNodeById(nodes, id)

      if (!target || target.type !== 'folder') return { nodes }

      const newChildren: TreeNode[] = []
      const groups: Record<string, TreeNode[]> = {}

      // Separate existing folders and extract files
      for (const child of target.children) {
        if (child.type === 'folder') {
          newChildren.push(child)
        } else {
          const parts = child.name.split('.')
          const ext = parts.length > 1 ? parts.pop()! : 'other'
          if (!groups[ext]) groups[ext] = []
          groups[ext].push(child)
        }
      }

      // Create new folders for extensions
      for (const [ext, files] of Object.entries(groups)) {
        let extFolder = newChildren.find(c => c.name === ext && c.type === 'folder')
        if (!extFolder) {
          extFolder = createFolder(ext)
          newChildren.push(extFolder)
        }
        extFolder.children.push(...files)
      }

      target.children = newChildren

      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history]
      newHistory.push({ nodes: deepClone(nodes), rootName: state.rootName })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()

      return { nodes, history: newHistory, historyIndex: newHistory.length - 1 }
    })
  },
"""

if 'flattenFolder: (id) => {' not in content:
    content = content.replace(
        "sortNodes: (id) => {",
        flatten_impl + "\n  sortNodes: (id) => {"
    )

with open('src/lib/tree-store.ts', 'w') as f:
    f.write(content)
