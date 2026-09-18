import re

with open('src/lib/tree-store.ts', 'r') as f:
    content = f.read()

# Add cloneStructure to TreeState interface
if 'cloneStructure: (id: string) => void' not in content:
    content = content.replace(
        "setNodeColor: (id: string, color: string | undefined) => void",
        "setNodeColor: (id: string, color: string | undefined) => void\n  cloneStructure: (id: string) => void"
    )

clone_impl = """
  cloneStructure: (id) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const { parent, index } = findParentOf(nodes, id)
      if (!parent) return { nodes }

      const original = parent[index]
      if (original.type !== 'folder') return { nodes }

      const cloneFoldersOnly = (node: TreeNode): TreeNode => {
        return createFolder(
          node.name + '-struct',
          node.children
            .filter(c => c.type === 'folder')
            .map(c => {
              const f = cloneFoldersOnly(c)
              f.name = f.name.replace('-struct', '') // only top level gets the -struct suffix to avoid collision
              return f
            })
        )
      }

      const clone = cloneFoldersOnly(original)
      parent.splice(index + 1, 0, clone)

      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history]
      newHistory.push({ nodes: deepClone(nodes), rootName: state.rootName })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()

      return { nodes, selectedId: clone.id, history: newHistory, historyIndex: newHistory.length - 1 }
    })
  },
"""

if 'cloneStructure: (id) => {' not in content:
    content = content.replace(
        "setNodeColor: (id, color) => {",
        clone_impl + "\n  setNodeColor: (id, color) => {"
    )

with open('src/lib/tree-store.ts', 'w') as f:
    f.write(content)
