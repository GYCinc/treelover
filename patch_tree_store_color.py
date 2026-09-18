import re

with open('src/lib/tree-store.ts', 'r') as f:
    content = f.read()

# Add color to TreeNode
if 'color?: string' not in content:
    content = content.replace(
        "isExpanded: boolean",
        "isExpanded: boolean\n  color?: string"
    )

# Add setNodeColor to TreeState interface
if 'setNodeColor: (id: string, color: string | undefined) => void' not in content:
    content = content.replace(
        "groupByExtension: (id: string) => void",
        "groupByExtension: (id: string) => void\n  setNodeColor: (id: string, color: string | undefined) => void"
    )

color_impl = """
  setNodeColor: (id, color) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const node = findNodeById(nodes, id)
      if (node) {
        node.color = color
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

if 'setNodeColor: (id, color) => {' not in content:
    content = content.replace(
        "groupByExtension: (id) => {",
        color_impl + "\n  groupByExtension: (id) => {"
    )

with open('src/lib/tree-store.ts', 'w') as f:
    f.write(content)
