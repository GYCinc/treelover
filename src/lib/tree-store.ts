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

// ─── Export generators ────────────────────────────────────────────────

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

export function generateMkdirCommands(rootName: string, nodes: TreeNode[], parentPath: string = ''): string {
  const lines: string[] = []
  lines.push(`mkdir -p ${rootName}`)
  const buildCommands = (items: TreeNode[], path: string) => {
    // Create all directories first
    for (const node of items) {
      const fullPath = path ? `${path}/${node.name}` : node.name
      if (node.type === 'folder') {
        lines.push(`mkdir -p ${rootName}/${fullPath}`)
      }
    }
    // Then create files and recurse
    for (const node of items) {
      const fullPath = path ? `${path}/${node.name}` : node.name
      if (node.type === 'file') {
        lines.push(`touch ${rootName}/${fullPath}`)
      }
      if (node.type === 'folder' && node.children.length > 0) {
        buildCommands(node.children, fullPath)
      }
    }
  }
  buildCommands(nodes, '')
  return lines.join('\n')
}

export function generateJsonStructure(rootName: string, nodes: TreeNode[]): string {
  const convertNode = (node: TreeNode): Record<string, unknown> => {
    if (node.type === 'folder') {
      const result: Record<string, unknown> = {}
      for (const child of node.children) {
        result[child.name] = convertNode(child)
      }
      return result
    }
    return null
  }
  const structure: Record<string, unknown> = {}
  for (const node of nodes) {
    structure[node.name] = convertNode(node)
  }
  return JSON.stringify({ [rootName]: structure }, null, 2)
}

// ─── Tree stats ───────────────────────────────────────────────────────

export interface TreeStats {
  folders: number
  files: number
  maxDepth: number
  totalNodes: number
}

export function computeStats(nodes: TreeNode[], depth: number = 1): TreeStats {
  let folders = 0
  let files = 0
  let maxDepth = depth

  for (const node of nodes) {
    if (node.type === 'folder') {
      folders++
      if (node.children.length > 0) {
        const childStats = computeStats(node.children, depth + 1)
        folders += childStats.folders
        files += childStats.files
        maxDepth = Math.max(maxDepth, childStats.maxDepth)
      }
    } else {
      files++
    }
  }

  return { folders, files, maxDepth, totalNodes: folders + files }
}

// ─── Parse tree text ──────────────────────────────────────────────────

export function parseTreeText(text: string): { rootName: string; nodes: TreeNode[] } {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  if (lines.length === 0) return { rootName: 'my-project', nodes: [] }

  const rootLine = lines[0]
  const rootName = rootLine.replace(/\/$/, '').replace(/[├└│─\s]+/g, '').trim() || 'my-project'

  const result: TreeNode[] = []
  const stack: { node: TreeNode; indent: number }[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    let depth = 0
    let j = 0
    while (j < line.length) {
      if (line[j] === '│' || line[j] === ' ') { depth++; j++ }
      else if (line[j] === '├' || line[j] === '└') { j += 4; break }
      else break
    }
    depth = Math.floor(depth / 4)

    const name = line.replace(/^[│├└─\s]+/, '').trim()
    if (!name) continue

    const isFolder = name.endsWith('/')
    const cleanName = name.replace(/\/$/, '')
    const node: TreeNode = isFolder ? createFolder(cleanName) : createFile(cleanName)

    if (depth === 0) {
      result.push(node)
      stack.length = 0
      stack.push({ node, indent: 0 })
    } else {
      while (stack.length > 1 && stack[stack.length - 1].indent >= depth) stack.pop()
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

// ─── Templates ────────────────────────────────────────────────────────

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  rootName: string
  nodes: TreeNode[]
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'nextjs',
    name: 'Next.js App',
    description: 'Full-stack Next.js with App Router',
    rootName: 'my-app',
    nodes: [
      createFolder('src', [
        createFolder('app', [
          createFolder('api', [
            createFolder('health', [createFile('route.ts')]),
          ]),
          createFile('layout.tsx'),
          createFile('page.tsx'),
          createFile('globals.css'),
        ]),
        createFolder('components', [
          createFolder('ui', [createFile('button.tsx'), createFile('input.tsx')]),
        ]),
        createFolder('lib', [createFile('utils.ts'), createFile('db.ts')]),
        createFolder('hooks', [createFile('use-auth.ts')]),
        createFolder('types', [createFile('index.ts')]),
      ]),
      createFolder('public', [
        createFile('favicon.ico'),
      ]),
      createFile('package.json'),
      createFile('tsconfig.json'),
      createFile('next.config.ts'),
      createFile('.env.example'),
      createFile('.gitignore'),
      createFile('README.md'),
    ],
  },
  {
    id: 'python',
    name: 'Python Project',
    description: 'Python package with tests and docs',
    rootName: 'my-package',
    nodes: [
      createFolder('src', [
        createFolder('my_package', [
          createFile('__init__.py'),
          createFile('main.py'),
          createFile('config.py'),
          createFolder('models', [createFile('__init__.py'), createFile('user.py')]),
          createFolder('services', [createFile('__init__.py'), createFile('auth.py')]),
          createFolder('utils', [createFile('__init__.py'), createFile('helpers.py')]),
        ]),
      ]),
      createFolder('tests', [
        createFile('conftest.py'),
        createFile('test_main.py'),
        createFolder('services', [createFile('test_auth.py')]),
      ]),
      createFolder('docs', [createFile('index.md')]),
      createFile('pyproject.toml'),
      createFile('requirements.txt'),
      createFile('.env.example'),
      createFile('.gitignore'),
      createFile('README.md'),
    ],
  },
  {
    id: 'react-lib',
    name: 'React Component Library',
    description: 'Publishable React component package',
    rootName: 'my-ui-lib',
    nodes: [
      createFolder('src', [
        createFolder('components', [
          createFile('Button.tsx'),
          createFile('Input.tsx'),
          createFile('Modal.tsx'),
          createFile('Card.tsx'),
        ]),
        createFolder('hooks', [
          createFile('useToggle.ts'),
          createFile('useClickOutside.ts'),
        ]),
        createFile('index.ts'),
      ]),
      createFolder('__tests__', [
        createFile('Button.test.tsx'),
      ]),
      createFolder('dist'),
      createFile('package.json'),
      createFile('tsconfig.json'),
      createFile('vite.config.ts'),
      createFile('.gitignore'),
      createFile('README.md'),
    ],
  },
  {
    id: 'go',
    name: 'Go Service',
    description: 'Go microservice with standard layout',
    rootName: 'my-service',
    nodes: [
      createFolder('cmd', [
        createFolder('server', [createFile('main.go')]),
      ]),
      createFolder('internal', [
        createFolder('handler', [createFile('health.go'), createFile('user.go')]),
        createFolder('service', [createFile('user.go')]),
        createFolder('repository', [createFile('user.go')]),
        createFolder('model', [createFile('user.go')]),
        createFolder('config', [createFile('config.go')]),
      ]),
      createFolder('pkg', [createFile('response.go')]),
      createFolder('migrations'),
      createFile('go.mod'),
      createFile('Makefile'),
      createFile('Dockerfile'),
      createFile('.gitignore'),
      createFile('README.md'),
    ],
  },
  {
    id: 'generic',
    name: 'Generic Project',
    description: 'Basic structure for any project',
    rootName: 'my-project',
    nodes: [
      createFolder('src', [
        createFile('index.ts'),
      ]),
      createFolder('docs', [createFile('README.md')]),
      createFolder('tests', [createFile('index.test.ts')]),
      createFile('package.json'),
      createFile('.gitignore'),
      createFile('README.md'),
    ],
  },
  {
    id: 'llm-wiki',
    name: 'LLM Wiki',
    description: 'Karpathy-style persistent knowledge wiki for agents',
    rootName: 'llm-wiki',
    nodes: [
      createFolder('raw', [
        createFolder('domain-1'),
        createFolder('domain-2'),
        createFolder('assets'),
      ]),
      createFolder('wiki', [
        createFile('index.md'),
        createFile('log.md'),
        createFile('overview.md'),
        createFolder('domain-1', [
          createFile('overview.md'),
          createFolder('sources'),
          createFolder('concepts'),
          createFolder('entities'),
        ]),
        createFolder('domain-2', [
          createFile('overview.md'),
          createFolder('sources'),
          createFolder('concepts'),
          createFolder('entities'),
        ]),
        createFolder('shared'),
      ]),
      createFolder('sessions', [
        createFolder('exports'),
        createFolder('confidential'),
        createFolder('wiki-digests'),
      ]),
      createFile('AGENTS.md'),
      createFile('.gitignore'),
      createFile('README.md'),
    ],
  },
]

// ─── Tree helpers ─────────────────────────────────────────────────────

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

/** Clone a node with new IDs for it and all descendants */
function cloneWithNewIds(node: TreeNode): TreeNode {
  if (node.type === 'file') {
    return createFile(node.name)
  }
  return createFolder(node.name, node.children.map(c => cloneWithNewIds(c)))
}

// ─── History for undo/redo ────────────────────────────────────────────

interface HistoryEntry {
  nodes: TreeNode[]
  rootName: string
}

const MAX_HISTORY = 50

// ─── Store ────────────────────────────────────────────────────────────

interface TreeState {
  rootName: string
  nodes: TreeNode[]
  selectedId: string | null
  editingId: string | null
  movingId: string | null

  // History
  history: HistoryEntry[]
  historyIndex: number
  canUndo: () => boolean
  canRedo: () => boolean
  undo: () => void
  redo: () => void

  // Actions
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
}

export const useTreeStore = create<TreeState>((set, get) => ({
  rootName: 'my-project',
  nodes: [],
  selectedId: null,
  editingId: null,
  movingId: null,
  history: [],
  historyIndex: -1,

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  undo: () => {
    const { historyIndex, history } = get()
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    const entry = history[newIndex]
    set({
      nodes: entry.nodes,
      rootName: entry.rootName,
      historyIndex: newIndex,
      selectedId: null,
      editingId: null,
      movingId: null,
    })
  },

  redo: () => {
    const { historyIndex, history } = get()
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    const entry = history[newIndex]
    set({
      nodes: entry.nodes,
      rootName: entry.rootName,
      historyIndex: newIndex,
      selectedId: null,
      editingId: null,
      movingId: null,
    })
  },

  setRootName: (name) => {
    const state = get()
    const newHistory = state.historyIndex < state.history.length - 1
      ? state.history.slice(0, state.historyIndex + 1)
      : [...state.history]
    newHistory.push({ nodes: deepClone(state.nodes), rootName: state.rootName })
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    set({ rootName: name, history: newHistory, historyIndex: newHistory.length - 1 })
  },

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
      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history]
      newHistory.push({ nodes: deepClone(nodes), rootName: state.rootName })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      return {
        nodes,
        selectedId: newNode.id,
        editingId: newNode.id,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
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
      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history]
      newHistory.push({ nodes: deepClone(nodes), rootName: state.rootName })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      return {
        nodes,
        selectedId: state.selectedId === id ? null : state.selectedId,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
  },

  renameNode: (id, name) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const node = findNodeById(nodes, id)
      if (node) node.name = name
      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history]
      newHistory.push({ nodes: deepClone(nodes), rootName: state.rootName })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      return { nodes, editingId: null, history: newHistory, historyIndex: newHistory.length - 1 }
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
      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history]
      newHistory.push({ nodes: deepClone(nodes), rootName: state.rootName })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      return { nodes, history: newHistory, historyIndex: newHistory.length - 1 }
    })
  },

  moveNodeTo: (nodeId, targetParentId) => {
    set((state) => {
      if (nodeId === targetParentId) return { movingId: null }
      const nodes = deepClone(state.nodes)
      if (targetParentId && isDescendantOf(nodes, nodeId, targetParentId)) {
        return { nodes: state.nodes, movingId: null }
      }
      const { parent: srcParent, index: srcIndex } = findParentOf(nodes, nodeId)
      if (!srcParent) return { nodes, movingId: null }
      const [removed] = srcParent.splice(srcIndex, 1)
      if (targetParentId === null) {
        nodes.push(removed)
      } else {
        const target = findNodeById(nodes, targetParentId)
        if (target && target.type === 'folder') {
          target.children.push(removed)
          target.isExpanded = true
        } else {
          srcParent.splice(srcIndex, 0, removed)
        }
      }
      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history]
      newHistory.push({ nodes: deepClone(nodes), rootName: state.rootName })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      return { nodes, movingId: null, selectedId: nodeId, history: newHistory, historyIndex: newHistory.length - 1 }
    })
  },

  duplicateNode: (id) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const { parent, index } = findParentOf(nodes, id)
      if (!parent) return { nodes }
      const original = parent[index]
      const clone = cloneWithNewIds(original)
      // Insert right after the original
      parent.splice(index + 1, 0, clone)
      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history]
      newHistory.push({ nodes: deepClone(nodes), rootName: state.rootName })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      return { nodes, selectedId: clone.id, history: newHistory, historyIndex: newHistory.length - 1 }
    })
  },

  setMovingId: (id) => set({ movingId: id }),
  cancelMove: () => set({ movingId: null }),

  importTree: (text) => {
    const { rootName, nodes } = parseTreeText(text)
    const state = get()
    const newHistory = [...state.history, { nodes: deepClone(nodes), rootName }]
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    set({ rootName, nodes, selectedId: null, editingId: null, movingId: null, history: newHistory, historyIndex: newHistory.length - 1 })
  },

  loadTemplate: (templateId) => {
    const template = TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    // Clone template nodes with new IDs
    const nodes = template.nodes.map(n => cloneWithNewIds(n))
    const state = get()
    const newHistory = [...state.history, { nodes: deepClone(nodes), rootName: template.rootName }]
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    set({
      rootName: template.rootName,
      nodes,
      selectedId: null,
      editingId: null,
      movingId: null,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },

  expandAll: () => {
    set((state) => {
      const expand = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map(n => ({
          ...n,
          isExpanded: n.type === 'folder' ? true : n.isExpanded,
          children: n.type === 'folder' ? expand(n.children) : [],
        }))
      return { nodes: expand(state.nodes) }
    })
  },

  collapseAll: () => {
    set((state) => {
      const collapse = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map(n => ({
          ...n,
          isExpanded: n.type === 'folder' ? false : n.isExpanded,
          children: n.type === 'folder' ? collapse(n.children) : [],
        }))
      return { nodes: collapse(state.nodes) }
    })
  },

  clearAll: () => {
    const state = get()
    const newHistory = [...state.history, { nodes: [], rootName: state.rootName }]
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    set({ nodes: [], selectedId: null, editingId: null, movingId: null, history: newHistory, historyIndex: newHistory.length - 1 })
  },
}))
