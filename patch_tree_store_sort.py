import re

with open('src/lib/tree-store.ts', 'r') as f:
    content = f.read()

# Add sortNodes to TreeState interface
if 'sortNodes: (id: string | null) => void' not in content:
    content = content.replace(
        "bulkRename: (find: string, replace: string, execute: boolean) => { id: string; oldName: string; newName: string }[]",
        "bulkRename: (find: string, replace: string, execute: boolean) => { id: string; oldName: string; newName: string }[]\n  sortNodes: (id: string | null) => void"
    )

# Add sortNodes implementation
sort_impl = """
  sortNodes: (id) => {
    set((state) => {
      const nodes = deepClone(state.nodes)

      const sortChildren = (children: TreeNode[]) => {
        children.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        for (const child of children) {
          if (child.type === 'folder') sortChildren(child.children)
        }
      }

      if (id === null) {
        sortChildren(nodes)
      } else {
        const node = findNodeById(nodes, id)
        if (node && node.type === 'folder') {
          sortChildren(node.children)
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

if 'sortNodes: (id) => {' not in content:
    content = content.replace(
        "bulkRename: (find, replaceStr, execute) => {",
        sort_impl + "\n  bulkRename: (find, replaceStr, execute) => {"
    )

with open('src/lib/tree-store.ts', 'w') as f:
    f.write(content)
