import { create } from 'zustand'

export interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'file'
  children: TreeNode[]
  isExpanded: boolean
}

let _idCounter = 0
function genId() {
  return `node-${++_idCounter}`
}

export function createFolder(name: string, children: TreeNode[] = []): TreeNode {
  return { id: genId(), name, type: 'folder', children, isExpanded: true }
}

export function createFile(name: string): TreeNode {
  return { id: genId(), name, type: 'file', children: [], isExpanded: false }
}

export function generateTreeText(nodes: TreeNode[], indent: number = 0, prefix: string = ''): string {
  const lines: string[] = []
  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1
    const connector = isLast ? '└── ' : '├── '
    const icon = node.type === 'folder' ? `${node.name}/` : node.name
    lines.push(prefix + connector + icon)

    if (node.type === 'folder' && node.children.length > 0) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ')
      lines.push(generateTreeText(node.children, indent + 1, newPrefix))
    }
  })
  return lines.join('\n')
}

export function generateFullTreeText(rootName: string, nodes: TreeNode[]): string {
  const header = rootName + '/'
  if (nodes.length === 0) return header
  return header + '\n' + generateTreeText(nodes)
}

export function parseTreeText(text: string): { rootName: string; nodes: TreeNode[] } {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  if (lines.length === 0) return { rootName: 'my-project', nodes: [] }

  // First line is root
  const rootLine = lines[0]
  const rootName = rootLine.replace(/\/$/, '').replace(/[├└│─\s]+/g, '').trim() || 'my-project'

  // Parse remaining lines
  const result: TreeNode[] = []
  const stack: { node: TreeNode; indent: number }[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]

    // Count the actual depth by looking at the raw prefix
    let depth = 0
    let j = 0
    while (j < line.length) {
      if (line[j] === '│' || line[j] === ' ') {
        depth++
        j++
      } else if (line[j] === '├' || line[j] === '└') {
        j += 4 // skip "├── " or "└── "
        break
      } else {
        break
      }
    }
    depth = Math.floor(depth / 4)

    const name = line.replace(/^[│├└─\s]+/, '').trim()
    if (!name) continue

    const isFolder = name.endsWith('/')
    const cleanName = name.replace(/\/$/, '')
    const node: TreeNode = isFolder
      ? createFolder(cleanName)
      : createFile(cleanName)

    if (depth === 0) {
      result.push(node)
      stack.length = 0
      stack.push({ node, indent: 0 })
    } else {
      while (stack.length > 1 && stack[stack.length - 1].indent >= depth) {
        stack.pop()
      }
      const parent = stack[stack.length - 1]
      if (parent && parent.node.type === 'folder') {
        parent.node.children.push(node)
      } else {
        result.push(node)
      }
      stack.push({ node, indent: depth })
    }
  }

  return { rootName, nodes: result }
}

// ─── Tree traversal helpers ──────────────────────────────────────────

function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.type === 'folder') {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

/** Returns the array and index where a node lives */
function findParentOf(nodes: TreeNode[], id: string): { parent: TreeNode[] | null; index: number } {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return { parent: nodes, index: i }
    if (nodes[i].type === 'folder') {
      const result = findParentOf(nodes[i].children, id)
      if (result.parent !== null) return result
    }
  }
  return { parent: null, index: -1 }
}

/** Returns the ancestor chain from root to the node with given id.
 *  Each entry is { node, childList, childIndex } meaning:
 *  node.children === childList, and childList[childIndex] is the next step down.
 *  The last entry is the target node itself.
 */
function findAncestorPath(
  nodes: TreeNode[],
  id: string,
  path: { node: TreeNode; childList: TreeNode[]; childIndex: number }[] = []
): { node: TreeNode; childList: TreeNode[]; childIndex: number }[] | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      return [...path, { node: nodes[i], childList: nodes, childIndex: i }]
    }
    if (nodes[i].type === 'folder') {
      const result = findAncestorPath(nodes[i].children, id, [
        ...path,
        { node: nodes[i], childList: nodes, childIndex: i },
      ])
      if (result) return result
    }
  }
  return null
}

/** Check if `targetId` is a descendant of `nodeId` — prevents circular nesting */
function isDescendantOf(nodes: TreeNode[], nodeId: string, targetId: string): boolean {
  const node = findNodeById(nodes, nodeId)
  if (!node || node.type !== 'folder') return false
  for (const child of node.children) {
    if (child.id === targetId) return true
    if (child.type === 'folder' && isDescendantOf(child.children, nodeId, targetId)) return true
  }
  return false
}

function deepClone(nodes: TreeNode[]): TreeNode[] {
  return nodes.map(n => ({
    ...n,
    children: n.type === 'folder' ? deepClone(n.children) : [],
  }))
}

// ─── Store ───────────────────────────────────────────────────────────

interface TreeState {
  rootName: string
  nodes: TreeNode[]
  selectedId: string | null
  editingId: string | null
  movingId: string | null

  setRootName: (name: string) => void
  addNode: (parentId: string | null, type: 'folder' | 'file') => void
  deleteNode: (id: string) => void
  renameNode: (id: string, name: string) => void
  toggleExpand: (id: string) => void
  selectNode: (id: string | null) => void
  setEditingId: (id: string | null) => void
  moveNode: (id: string, direction: 'up' | 'down') => void
  moveNodeTo: (nodeId: string, targetParentId: string | null) => void
  setMovingId: (id: string | null) => void
  cancelMove: () => void
  importTree: (text: string) => void
  clearAll: () => void
}

export const useTreeStore = create<TreeState>((set) => ({
  rootName: 'my-project',
  nodes: [],
  selectedId: null,
  editingId: null,
  movingId: null,

  setRootName: (name) => set({ rootName: name }),

  addNode: (parentId, type) => {
    const newNode = type === 'folder' ? createFolder('new-folder') : createFile('new-file')
    set((state) => {
      const nodes = deepClone(state.nodes)
      if (parentId === null) {
        nodes.push(newNode)
      } else {
        const parent = findNodeById(nodes, parentId)
        if (parent && parent.type === 'folder') {
          parent.children.push(newNode)
          parent.isExpanded = true
        }
      }
      return { nodes, selectedId: newNode.id, editingId: newNode.id }
    })
  },

  deleteNode: (id) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const { parent } = findParentOf(nodes, id)
      if (parent) {
        const idx = parent.findIndex(n => n.id === id)
        if (idx !== -1) parent.splice(idx, 1)
      }
      return { nodes, selectedId: state.selectedId === id ? null : state.selectedId }
    })
  },

  renameNode: (id, name) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const node = findNodeById(nodes, id)
      if (node) node.name = name
      return { nodes, editingId: null }
    })
  },

  toggleExpand: (id) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const node = findNodeById(nodes, id)
      if (node && node.type === 'folder') node.isExpanded = !node.isExpanded
      return { nodes }
    })
  },

  selectNode: (id) => set({ selectedId: id }),

  setEditingId: (id) => set({ editingId: id }),

  moveNode: (id, direction) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const { parent, index } = findParentOf(nodes, id)
      if (!parent) return { nodes }
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= parent.length) return { nodes }
      const temp = parent[index]
      parent[index] = parent[newIndex]
      parent[newIndex] = temp
      return { nodes }
    })
  },

  moveNodeTo: (nodeId, targetParentId) => {
    set((state) => {
      // Can't move to self
      if (nodeId === targetParentId) return { movingId: null }

      const nodes = deepClone(state.nodes)

      // Prevent moving a folder into its own descendant
      if (targetParentId && isDescendantOf(nodes, nodeId, targetParentId)) {
        return { nodes: state.nodes, movingId: null }
      }

      // Remove node from its current location
      const { parent: srcParent, index: srcIndex } = findParentOf(nodes, nodeId)
      if (!srcParent) return { nodes, movingId: null }
      const [removed] = srcParent.splice(srcIndex, 1)

      // Insert into target
      if (targetParentId === null) {
        // Move to root
        nodes.push(removed)
      } else {
        const target = findNodeById(nodes, targetParentId)
        if (target && target.type === 'folder') {
          target.children.push(removed)
          target.isExpanded = true
        } else {
          // Target vanished, put it back
          srcParent.splice(srcIndex, 0, removed)
        }
      }

      return { nodes, movingId: null, selectedId: nodeId }
    })
  },

  setMovingId: (id) => set({ movingId: id }),

  cancelMove: () => set({ movingId: null }),

  importTree: (text) => {
    const { rootName, nodes } = parseTreeText(text)
    set({ rootName, nodes, selectedId: null, editingId: null, movingId: null })
  },

  clearAll: () => set({ nodes: [], selectedId: null, editingId: null, movingId: null }),
}))
