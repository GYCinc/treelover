import re

with open('src/lib/tree-store.ts', 'r') as f:
    content = f.read()

# Add bulkRename to TreeState interface
if 'bulkRename: (find: string, replace: string, previewOnly: boolean) => { id: string; oldName: string; newName: string }[]' not in content:
    content = content.replace(
        "bulkAddPaths: (pathsText: string) => void",
        "bulkAddPaths: (pathsText: string) => void\n  bulkRename: (find: string, replace: string, execute: boolean) => { id: string; oldName: string; newName: string }[]"
    )

# Add bulkRename implementation
bulk_rename_impl = """
  bulkRename: (find, replaceStr, execute) => {
    if (!find) return []

    const state = get()
    const affected: { id: string; oldName: string; newName: string }[] = []

    // We do case sensitive matching using simple replace
    const processNodes = (nodes: TreeNode[], mutate: boolean) => {
      const result: TreeNode[] = []
      for (const node of nodes) {
        let newName = node.name
        if (newName.includes(find)) {
          newName = newName.split(find).join(replaceStr)
          affected.push({ id: node.id, oldName: node.name, newName })
        }

        const newNode = mutate ? { ...node, name: newName } : node
        if (node.type === 'folder' && node.children.length > 0) {
          const newChildren = processNodes(node.children, mutate)
          if (mutate) newNode.children = newChildren
        }

        result.push(newNode)
      }
      return result
    }

    if (execute) {
      set((state) => {
        const newNodes = processNodes(deepClone(state.nodes), true)
        const newHistory = state.historyIndex < state.history.length - 1
          ? state.history.slice(0, state.historyIndex + 1)
          : [...state.history]
        newHistory.push({ nodes: deepClone(newNodes), rootName: state.rootName })
        if (newHistory.length > MAX_HISTORY) newHistory.shift()
        return { nodes: newNodes, history: newHistory, historyIndex: newHistory.length - 1 }
      })
    } else {
      processNodes(state.nodes, false)
    }

    return affected
  },
"""

if 'bulkRename: (find, replaceStr, execute) => {' not in content:
    content = content.replace(
        "bulkAddPaths: (pathsText) => {",
        bulk_rename_impl + "\n  bulkAddPaths: (pathsText) => {"
    )

with open('src/lib/tree-store.ts', 'w') as f:
    f.write(content)
