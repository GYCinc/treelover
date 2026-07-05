'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { z } from 'zod'
import {
  useTreeStore,
  generateFullTreeText,
  generateMkdirCommands,
  generateJsonStructure,
  computeStats,
  TEMPLATES,
  ZSnapshotSchema,
  type TreeNode,
  type AiNodeDTO,
  type ThemeName,
} from '@/lib/tree-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  FolderPlus,
  FilePlus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  Copy,
  Check,
  Download,
  Upload,
  Pencil,
  ArrowUp,
  ArrowDown,
  Terminal,
  Eraser,
  Zap,
  Move,
  X,
  GripVertical,
  Undo2,
  Redo2,
  CopyPlus,
  ChevronsDownUp,
  ChevronsUpDown,
  LayoutTemplate,
  FileCode,
  Braces,
  Hash,
  Layers,
  BookOpen,
  Calendar,
  Sparkles,
  Loader2,
  HelpCircle,
  FolderOpen,
} from 'lucide-react'

// ─── Export format type ──────────────────────────────────────────────

type ExportFormat = 'tree' | 'mkdir' | 'json' | 'script'

// ─── Draggable Tree Node ──────────────────────────────────────────────

function DraggableTreeNodeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const {
    selectedId, editingId, movingId,
    selectNode, toggleExpand, deleteNode, renameNode,
    setEditingId, addNode, moveNode, moveNodeTo, setMovingId, cancelMove, duplicateNode,
  } = useTreeStore()

  const isSelected = selectedId === node.id
  const isEditing = editingId === node.id
  const isBeingMoved = movingId === node.id
  const isClickDropTarget = movingId !== null && node.type === 'folder' && movingId !== node.id

  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: node.id, data: { node },
  })
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `drop-${node.id}`, data: { node }, disabled: node.type !== 'folder',
  })

  const isDropHovered = isOver && node.type === 'folder'

  useEffect(() => {
    if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select() }
  }, [isEditing])

  const handleDoubleClick = () => { if (!movingId) setEditingId(node.id) }
  const handleRenameSubmit = () => {
    const val = inputRef.current?.value.trim()
    if (val) renameNode(node.id, val); else setEditingId(null)
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') { if (movingId) cancelMove(); else setEditingId(null) }
  }
  const handleClick = () => {
    if (movingId && isClickDropTarget) moveNodeTo(movingId, node.id)
    else if (movingId && isBeingMoved) cancelMove()
    else selectNode(node.id)
  }
  const combinedRef = useCallback((el: HTMLDivElement | null) => {
    setNodeRef(el); if (node.type === 'folder') setDroppableRef(el)
  }, [setNodeRef, setDroppableRef, node.type])

  return (
    <>
      <div
        ref={combinedRef}
        className={`group flex items-center gap-1 py-1 px-2 cursor-pointer transition-all ${
          isDragging ? 'opacity-40 ring-2 ring-primary/30'
          : isBeingMoved ? 'bg-primary/20 ring-2 ring-primary/60 shadow-[0_0_8px_var(--border)]'
          : isDropHovered ? 'bg-accent/20 ring-2 ring-accent/70 shadow-[0_0_12px_var(--border)]'
          : isClickDropTarget ? 'bg-primary/5 ring-1 ring-primary/30 hover:bg-primary/10'
          : isSelected ? 'bg-secondary text-foreground ring-1 ring-border'
          : 'hover:bg-secondary/40'
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <span {...attributes} {...listeners} className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-3.5 w-3.5" />
        </span>

        {node.type === 'folder' ? (
          <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id) }}
            className={`shrink-0 p-0.5 rounded hover:bg-secondary/60 ${isDropHovered || isClickDropTarget ? 'text-accent' : 'text-primary'}`}>
            {node.isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : <span className="w-5 shrink-0" />}

        {node.type === 'folder' ? (
          <Folder className={`h-4 w-4 shrink-0 ${isDropHovered ? 'text-accent' : 'text-primary'}`} />
        ) : (
          <File className="h-4 w-4 text-foreground/60 shrink-0" />
        )}

        {isEditing ? (
          <Input ref={inputRef} defaultValue={node.name}
            className="h-6 text-sm py-0 px-1 flex-1 min-w-0 bg-background border-border text-foreground focus:border-primary"
            onBlur={handleRenameSubmit} onKeyDown={handleKeyDown} onClick={(e) => e.stopPropagation()} />
        ) : (
          <span className="text-sm truncate flex-1 min-w-0 select-none glow-active">
            {node.name}{node.type === 'folder' && <span className="text-muted-foreground">/</span>}
          </span>
        )}

        {isDropHovered && !isEditing && (
          <span className="text-accent text-[0.6rem] tracking-wider uppercase glow-active animate-pulse shrink-0 font-bold">DROP IN</span>
        )}
        {isBeingMoved && !isEditing && !isDragging && (
          <span className="text-primary text-[0.6rem] tracking-wider uppercase glow-active animate-pulse shrink-0">MOVING</span>
        )}

        <div className={`flex items-center gap-0.5 shrink-0 transition-opacity ${isSelected || isBeingMoved ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {movingId === null && (
            <>
              {node.type === 'folder' && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); addNode(node.id, 'folder') }} className="p-1 rounded hover:bg-secondary text-accent" title="Add subfolder"><FolderPlus className="h-3.5 w-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); addNode(node.id, 'file') }} className="p-1 rounded hover:bg-secondary text-foreground" title="Add file"><FilePlus className="h-3.5 w-3.5" /></button>
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); setMovingId(node.id) }} className="p-1 rounded hover:bg-secondary text-primary" title="Move"><Move className="h-3.5 w-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); duplicateNode(node.id) }} className="p-1 rounded hover:bg-secondary text-foreground" title="Duplicate"><CopyPlus className="h-3.5 w-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); setEditingId(node.id) }} className="p-1 rounded hover:bg-secondary text-foreground" title="Rename"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); moveNode(node.id, 'up') }} className="p-1 rounded hover:bg-secondary text-muted-foreground" title="Move up"><ArrowUp className="h-3 w-3" /></button>
              <button onClick={(e) => { e.stopPropagation(); moveNode(node.id, 'down') }} className="p-1 rounded hover:bg-secondary text-muted-foreground" title="Move down"><ArrowDown className="h-3 w-3" /></button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); if (isBeingMoved) cancelMove(); else deleteNode(node.id) }}
            className={`p-1 rounded hover:bg-secondary ${isBeingMoved ? 'text-primary' : 'text-destructive'}`}
            title={isBeingMoved ? 'Cancel move' : 'Delete'}>
            {isBeingMoved ? <X className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {node.type === 'folder' && node.isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <DraggableTreeNodeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </>
  )
}

// ─── Drag Overlay ──────────────────────────────────────────────────────

function DragOverlayContent({ node }: { node: TreeNode | null }) {
  if (!node) return null
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 bg-secondary border border-primary rounded shadow-[0_0_16px_var(--border)] opacity-90">
      {node.type === 'folder' ? <Folder className="h-4 w-4 text-primary" /> : <File className="h-4 w-4 text-foreground/80" />}
      <span className="text-sm font-mono text-primary glow-active">{node.name}{node.type === 'folder' && '/'}</span>
    </div>
  )
}

// ─── File System Scanner ───────────────────────────────────────────────

interface FsNode {
  name: string
  type: 'folder' | 'file'
  children: FsNode[]
}

async function scanDirectory(dirHandle: FileSystemDirectoryHandle): Promise<FsNode[]> {
  const nodes: FsNode[] = []
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.') && name !== '.github' && name !== '.vscode') continue
    if (handle.kind === 'directory') {
      const children = await scanDirectory(handle)
      nodes.push({ name, type: 'folder', children })
    } else {
      nodes.push({ name, type: 'file', children: [] })
    }
  }
  nodes.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name)
    return a.type === 'folder' ? -1 : 1
  })
  return nodes
}

// ─── Root Drop Zone ────────────────────────────────────────────────────

function RootDropZone({ rootName, onRootNameChange, isMoveMode, onDropAtRoot }: {
  rootName: string; isMoveMode: boolean; onRootNameChange: (name: string) => void; onDropAtRoot: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'drop-root', data: { isRoot: true } })
  return (
    <div ref={setNodeRef}
      className={`px-4 py-2 border-b flex items-center gap-2 transition-all ${
        isOver ? 'bg-amber-900/30 ring-2 ring-amber-400/60'
        : isMoveMode ? 'border-amber-700/40 bg-amber-900/10 hover:bg-amber-900/20 cursor-pointer'
        : 'border-green-900/40'}`}
      onClick={() => { if (isMoveMode) onDropAtRoot() }}>
      <Folder className="h-4 w-4 text-amber-400" />
      <span className="text-[0.65rem] text-green-600 font-mono tracking-wider shrink-0">ROOT:</span>
      <Input value={rootName} onChange={(e) => onRootNameChange(e.target.value)}
        className="h-6 text-sm font-mono bg-black/40 border-green-800/40 text-green-300 glow-green focus:border-amber-600/50 px-2"
        onClick={(e) => { if (isMoveMode) { e.stopPropagation(); onDropAtRoot() } }} />
      {(isOver || isMoveMode) && (
        <span className="text-[0.6rem] text-amber-400/80 font-mono shrink-0 glow-amber">{isOver ? '[DROP HERE]' : '[drop at root]'}</span>
      )}
    </div>
  )
}

// ─── Stats Bar ─────────────────────────────────────────────────────────

function StatsBar() {
  const nodes = useTreeStore((s) => s.nodes)
  const stats = computeStats(nodes)
  if (stats.totalNodes === 0) return null
  return (
    <div className="flex items-center gap-4 px-4 py-1.5 border-b border-green-900/30 bg-[#060906] text-[0.6rem] font-mono text-green-600">
      <span className="flex items-center gap-1"><Folder className="h-3 w-3 text-amber-400" />{stats.folders} folders</span>
      <span className="flex items-center gap-1"><File className="h-3 w-3 text-green-400" />{stats.files} files</span>
      <span className="flex items-center gap-1"><Layers className="h-3 w-3 text-green-500" />depth {stats.maxDepth}</span>
      <span className="flex items-center gap-1"><Hash className="h-3 w-3 text-green-600" />{stats.totalNodes} total</span>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function Home() {
  const {
    rootName, nodes, movingId,
    setRootName, addNode, moveNodeTo, cancelMove, clearAll, importTree,
    loadTemplate, duplicateNode: _dup, undo, redo, canUndo, canRedo,
    expandAll, collapseAll, applyAiTree, originalSnapshot,
  } = useTreeStore()

  const [copied, setCopied] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [showOutput, setShowOutput] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('tree')
  const [activeDragNode, setActiveDragNode] = useState<TreeNode | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiResults, setAiResults] = useState<{
    analysis: string
    proposed: { rootName: string; nodes: AiNodeDTO[] } | null
    verification: { safe: boolean; issues: string[]; confidence: number }
    showPanel: boolean
  } | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const getOutputText = useCallback(() => {
    switch (exportFormat) {
      case 'mkdir': return generateMkdirCommands(rootName, nodes)
      case 'json': return generateJsonStructure(rootName, nodes)
      default: return generateFullTreeText(rootName, nodes)
    }
  }, [exportFormat, rootName, nodes])

  const outputText = getOutputText()

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const node = event.active.data.current?.node as TreeNode | undefined
    if (node) setActiveDragNode(node)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragNode(null)
    if (!over) return
    const draggedNodeId = active.id as string
    const overData = over.data.current
    if (overData?.isRoot) { moveNodeTo(draggedNodeId, null); return }
    const targetNode = overData?.node as TreeNode | undefined
    if (targetNode && targetNode.type === 'folder') moveNodeTo(draggedNodeId, targetNode.id)
  }, [moveNodeTo])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(outputText)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }, [outputText])

  const handleDownload = useCallback(() => {
    const ext = exportFormat === 'json' ? 'json' : 'txt'
    const blob = new Blob([outputText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${rootName}-structure.${ext}`; a.click()
    URL.revokeObjectURL(url)
  }, [outputText, rootName, exportFormat])

  const handleImport = useCallback(() => {
    if (importText.trim()) { importTree(importText); setImportText(''); setShowImport(false) }
  }, [importText, importTree])

  const handleMoveToRoot = useCallback(() => { if (movingId) moveNodeTo(movingId, null) }, [movingId, moveNodeTo])

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

  // Convert tree nodes to the minimal DTO format the AI expects
  const treeToDto = useCallback((nodes: TreeNode[]): AiNodeDTO[] => {
    return nodes.map(n => ({
      name: n.name,
      type: n.type,
      children: n.type === 'folder' ? treeToDto(n.children) : [],
    }))
  }, [])

  const handleAiSubmit = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    setAiResults(null)
    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree: treeToDto(nodes),
          rootName,
          prompt: aiPrompt.trim(),
        }),
      })
      const data = await res.json()
      if (data.error) {
        setAiError(data.error)
      } else {
        setAiResults({
          analysis: data.analysis || '',
          proposed: data.proposed,
          verification: data.verification || { safe: false, issues: [], confidence: 0 },
          showPanel: true,
        })
      }
    } catch {
      setAiError('Network error')
    } finally {
      setAiLoading(false)
    }
  }, [aiPrompt, aiLoading, nodes, rootName, treeToDto])

  const handleApplyProposed = useCallback(() => {
    if (aiResults?.proposed?.nodes) {
      applyAiTree(aiResults.proposed.rootName || rootName, aiResults.proposed.nodes)
      setAiResults(null)
      setAiPrompt('')
    }
  }, [aiResults, rootName, applyAiTree])

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

  const {
    theme, setTheme, skin, setSkin, snapshots, createSnapshot, restoreSnapshot, deleteSnapshot
  } = useTreeStore()

  const [snapshotName, setSnapshotName] = useState('')
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // Hydrate snapshots, theme, and skin client-side to prevent SSR mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('tree-theme') as ThemeName | null
      setTheme(storedTheme || 'green')
      
      const storedSkin = localStorage.getItem('tree-skin') as SkinName | null
      setSkin(storedSkin || 'terminal')
      
      const storedSnaps = localStorage.getItem('tree-snapshots')
      if (storedSnaps) {
        try {
          const parsed = JSON.parse(storedSnaps)
          const validated = z.array(ZSnapshotSchema).parse(parsed)
          useTreeStore.setState({ snapshots: validated })
        } catch (e) {
          console.error("Failed to load/validate local snapshots:", e)
        }
      }
    }
  }, [setTheme, setSkin])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (canUndo()) undo() }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); if (canRedo()) redo() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [undo, redo, canUndo, canRedo])

  const isCrtActive = skin === 'terminal'

  return (
    <div className={`min-h-screen bg-background text-foreground ${isCrtActive ? 'crt-flicker patina-grid' : ''}`} data-theme={theme} data-skin={skin}>
      {isCrtActive && (
        <>
          <div className="crt-scanlines" />
          <div className="crt-scanline-bar" />
          <div className="crt-vignette" />
        </>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-border rounded bg-secondary">
              <Terminal className="h-5 w-5 text-primary glow-active-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-widest uppercase text-primary glow-active">tree_Lover</h1>
              <p className="text-[0.65rem] text-muted-foreground tracking-wider uppercase">
                Visual folder structure builder &gt; export for agents
              </p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-1.5">
            {/* Skin selector */}
            <div className="flex items-center gap-1 border border-border px-2 py-0.5 rounded mr-1">
              <span className="text-[0.65rem] text-muted-foreground font-mono tracking-wider mr-1">SKIN:</span>
              {(['terminal', 'modern', 'chalkboard'] as SkinName[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSkin(s)}
                  className={`text-[0.6rem] px-1.5 py-0.5 font-mono uppercase rounded transition-colors ${
                    skin === s
                      ? 'bg-secondary text-foreground border border-border font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Theme selector */}
            <div className="flex items-center gap-1 border border-border px-2 py-0.5 rounded mr-1 flex-wrap">
              <span className="text-[0.65rem] text-muted-foreground font-mono tracking-wider mr-1">THEME:</span>
              {(['green', 'amber', 'blue', 'classic', 'cyber-glass', 'nord-dark', 'nord-light', 'dracula', 'solarized-light'] as ThemeName[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`text-[0.6rem] px-1.5 py-0.5 font-mono uppercase rounded transition-colors ${
                    theme === t
                      ? 'bg-secondary text-foreground border border-border glow-active font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            
            <Button variant="outline" size="sm" onClick={() => setShowSnapshots(!showSnapshots)}
              className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs">
              <Layers className="h-3.5 w-3.5 mr-1.5" />SNAPSHOTS ({snapshots.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}
              className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs">
              <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />TEMPLATES
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)}
              className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs">
              <Upload className="h-3.5 w-3.5 mr-1.5" />IMPORT
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectFolder}
              className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs">
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" />SELECT FOLDER
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowHelp(!showHelp)}
              className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs">
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />HELP
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}
              className="border-border text-destructive hover:bg-secondary bg-transparent font-mono text-xs">
              <Eraser className="h-3.5 w-3.5 mr-1.5" />CLEAR
            </Button>
          </div>
        </div>
      </header>

      {/* Help Panel */}
      {showHelp && (
        <div className="border-b border-border bg-card p-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-xs font-bold tracking-widest uppercase text-primary glow-active mb-3 font-mono">{'>'} QUICK START & CONTROLS:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono text-muted-foreground leading-relaxed">
              <div className="border border-border p-3 bg-background/50 rounded">
                <span className="text-primary font-bold">01</span> Drag nodes onto folders to re-nest.
                <p className="mt-1 text-[0.65rem] text-muted-foreground/80">Use the grab icon <GripVertical className="h-3 w-3 inline" /> on the left of each row to move nodes.</p>
              </div>
              <div className="border border-border p-3 bg-background/50 rounded">
                <span className="text-primary font-bold">02</span> Duplicate <CopyPlus className="h-3 w-3 inline text-foreground/80" /> clones folder structures.
                <p className="mt-1 text-[0.65rem] text-muted-foreground/80">Creates a duplicate copy of selected nodes including nested children.</p>
              </div>
              <div className="border border-border p-3 bg-background/50 rounded">
                <span className="text-primary font-bold">03</span> Keyboard Shortcuts:
                <p className="mt-1 text-[0.65rem] text-muted-foreground/80">Undo actions with <kbd className="bg-secondary px-1 border border-border">Ctrl+Z</kbd> and Redo with <kbd className="bg-secondary px-1 border border-border">Ctrl+Y</kbd>.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snapshots Panel */}
      {showSnapshots && (
        <div className="border-b border-border bg-card p-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-xs text-primary mb-2 glow-active font-mono tracking-wider">{'>'} LOCAL SAFE SNAPSHOTS (STORED ON DEVICE):</h3>
            
            <div className="flex gap-2 mb-4 max-w-md">
              <Input
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="Snapshot label..."
                className="h-7 text-xs font-mono bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <Button
                size="sm"
                onClick={() => { createSnapshot(snapshotName); setSnapshotName('') }}
                className="bg-secondary border border-border text-foreground hover:bg-muted font-mono text-xs h-7 shrink-0"
              >
                CREATE SNAPSHOT
              </Button>
            </div>

            {snapshots.length === 0 ? (
              <p className="text-[0.65rem] font-mono text-muted-foreground">No snapshots created yet. Snapshots let you save current workspace locally before script executions.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {snapshots.map((s) => (
                  <div key={s.id} className="border border-border bg-background/40 p-2 flex items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-mono text-foreground truncate font-bold">{s.name}</span>
                      <span className="text-[0.55rem] font-mono text-muted-foreground">
                        {s.rootName}/ • {new Date(s.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => restoreSnapshot(s.id)}
                        className="bg-secondary border border-border text-foreground hover:bg-muted font-mono text-[0.6rem] h-6 px-2"
                      >
                        REVERT
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSnapshot(s.id)}
                        className="text-destructive hover:text-red-400 hover:bg-red-900/10 font-mono text-[0.6rem] h-6 px-1"
                      >
                        DELETE
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Panel */}
      {showTemplates && (
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <p className="text-xs text-primary mb-2 glow-active font-mono tracking-wider">{'>'} LOAD A PROJECT TEMPLATE:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => { loadTemplate(t.id); setShowTemplates(false) }}
                  className="flex flex-col items-start p-2.5 rounded border border-border bg-background/50 hover:bg-secondary transition-colors text-left">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {t.id === 'llm-wiki' ? <BookOpen className="h-3 w-3 text-primary" /> : null}
                    {t.id === 'weekly-calendar' ? <Calendar className="h-3 w-3 text-accent" /> : null}
                    <span className="text-xs font-mono text-primary glow-active">{t.name}</span>
                  </div>
                  <span className="text-[0.55rem] font-mono text-muted-foreground">{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Move mode banner */}
      {movingId && (
        <div className="border-b border-primary/50 bg-secondary/20">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Move className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs font-mono text-primary glow-active tracking-wider">MOVE MODE — click folder or drag to drop</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleMoveToRoot} className="bg-secondary border border-border text-foreground hover:bg-muted font-mono text-xs h-6">MOVE TO ROOT</Button>
              <Button size="sm" variant="ghost" onClick={cancelMove} className="text-destructive hover:text-red-300 hover:bg-red-900/20 font-mono text-xs h-6">[ESC]</Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <p className="text-xs text-primary mb-2 glow-active font-mono">{'>'} PASTE EXISTING TREE STRUCTURE:</p>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)}
              className="w-full h-32 border border-border bg-background p-3 text-sm font-mono resize-y text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              placeholder={`my-project/\n├── src/\n│   ├── components/\n│   └── pages/\n└── package.json`} />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleImport} className="bg-secondary border border-border text-foreground hover:bg-muted font-mono text-xs">{'>'} IMPORT</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowImport(false); setImportText('') }} className="text-muted-foreground hover:text-foreground hover:bg-secondary font-mono text-xs">[CANCEL]</Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Tree Builder */}
          <div className="terminal-border crt-screen bg-card flex flex-col" data-dragging={activeDragNode !== null} suppressHydrationWarning>
            {/* Toolbar */}
            <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-background/50">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold tracking-widest uppercase text-primary glow-active">BUILDER</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo()}
                  className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs h-7 w-7 p-0" title="Undo (Ctrl+Z)">
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo()}
                  className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs h-7 w-7 p-0" title="Redo (Ctrl+Y)">
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
                <span className="w-px h-4 bg-border/40" />
                <Button variant="outline" size="sm" onClick={expandAll}
                  className="border-border text-foreground hover:bg-secondary bg-transparent h-7 w-7 p-0" title="Expand all">
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}
                  className="border-border text-foreground hover:bg-secondary bg-transparent h-7 w-7 p-0" title="Collapse all">
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                </Button>
                <span className="w-px h-4 bg-border/40" />
                <Button variant="outline" size="sm" onClick={() => addNode(null, 'folder')}
                  className="border-border text-primary hover:bg-secondary bg-transparent font-mono text-xs h-7">
                  <FolderPlus className="h-3.5 w-3.5 mr-1" />FOLDER
                </Button>
                <Button variant="outline" size="sm" onClick={() => addNode(null, 'file')}
                  className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs h-7">
                  <FilePlus className="h-3.5 w-3.5 mr-1" />FILE
                </Button>
              </div>
            </div>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <RootDropZone rootName={rootName} onRootNameChange={setRootName} isMoveMode={movingId !== null} onDropAtRoot={handleMoveToRoot} />
              <StatsBar />
              <div className="flex-1 p-1 overflow-hidden">
                <ScrollArea className="h-[calc(100vh-380px)] min-h-[260px]">
                  {nodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Folder className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm font-mono glow-active tracking-wider">NO ITEMS LOADED</p>
                      <p className="text-[0.65rem] mt-1 font-mono text-muted-foreground/80">Use FOLDER/FILE buttons, or load a TEMPLATE</p>
                    </div>
                  ) : (
                    <div className="py-1">{nodes.map((node) => <DraggableTreeNodeRow key={node.id} node={node} depth={1} />)}</div>
                  )}
                </ScrollArea>
              </div>
              <DragOverlay dropAnimation={null}><DragOverlayContent node={activeDragNode} /></DragOverlay>
            </DndContext>

            {/* AI Command Bar */}
            <div className="border-t border-border bg-background/30 px-3 py-2">
              <form onSubmit={(e) => { e.preventDefault(); handleAiSubmit() }}
                className="flex items-center gap-2">
                <Sparkles className={`h-3.5 w-3.5 shrink-0 ${aiLoading ? 'text-primary animate-pulse' : 'text-primary/70'}`} />
                <Input
                  value={aiPrompt}
                  onChange={(e) => { setAiPrompt(e.target.value); setAiError(null) }}
                  placeholder="AI: add docker, make it a monorepo, suggest a blog layout..."
                  disabled={aiLoading}
                  className="h-7 text-xs font-mono bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 px-2 flex-1 min-w-0"
                />
                <Button type="submit" size="sm" disabled={aiLoading || !aiPrompt.trim()}
                  className="bg-secondary border border-border text-foreground hover:bg-muted font-mono text-xs h-7 px-2.5 shrink-0 disabled:opacity-40">
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'GO'}
                </Button>
              </form>
              {aiError && (
                <p className="text-[0.55rem] text-destructive font-mono mt-1 px-1">{aiError}</p>
              )}
            </div>

            {/* Orchestration Results Panel */}
            {aiResults?.showPanel && (
              <div className="border-t border-border bg-background/50 px-3 py-2 max-h-64 overflow-y-auto">
                {/* Analyzer */}
                <div className="mb-2">
                  <p className="text-[0.6rem] font-bold text-primary uppercase tracking-wider mb-1">{'>'} Analyzer</p>
                  <pre className="text-[0.6rem] text-foreground font-mono whitespace-pre-wrap leading-relaxed">{aiResults.analysis}</pre>
                </div>
                {/* Verifier */}
                <div className="mb-2">
                  <p className="text-[0.6rem] font-bold text-primary uppercase tracking-wider mb-1">{'>'} Verifier</p>
                  <div className={`text-[0.6rem] font-mono ${aiResults.verification.safe ? 'text-foreground' : 'text-primary'}`}>
                    Safe: {aiResults.verification.safe ? 'YES' : 'NO'}
                    {aiResults.verification.issues.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {aiResults.verification.issues.map((issue, i) => (
                          <li key={i}>• {issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {/* Apply button */}
                {aiResults.proposed?.nodes && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleApplyProposed}
                      className="bg-secondary border border-border text-foreground hover:bg-muted font-mono text-xs h-7">
                      APPLY PROPOSED TREE
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAiResults(null)}
                      className="text-muted-foreground hover:text-foreground hover:bg-secondary font-mono text-xs h-7">
                      [DISMISS]
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Output */}
          <div className="terminal-border-amber crt-screen bg-card flex flex-col" suppressHydrationWarning>
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-background/50">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-foreground" />
                <span className="text-xs font-bold tracking-widest uppercase text-foreground glow-active">OUTPUT</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Export format toggle */}
                {([
                  { key: 'tree' as ExportFormat, icon: FileCode, label: 'Tree' },
                  { key: 'mkdir' as ExportFormat, icon: Terminal, label: 'mkdir' },
                  { key: 'json' as ExportFormat, icon: Braces, label: 'JSON' },
                  { key: 'script' as ExportFormat, icon: Download, label: 'Script' },
                ]).map(({ key, icon: Icon, label }) => (
                  <Button key={key} variant="ghost" size="sm"
                    onClick={() => setExportFormat(key)}
                    className={`h-6 px-2 font-mono text-[0.6rem] ${
                      exportFormat === key ? 'text-primary bg-secondary border border-border font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    <Icon className="h-3 w-3 mr-1" />{label}
                  </Button>
                ))}
                <span className="w-px h-4 bg-border/40" />
                <Button variant="outline" size="sm" onClick={() => setShowOutput(!showOutput)}
                  className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs h-6">
                  {showOutput ? '[HIDE]' : '[SHOW]'}
                </Button>
              </div>
            </div>

            <div className="flex-1 p-4">
              {showOutput && (
                <>
                  <div className="relative">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-red-500/60" />
                      <span className="w-2 h-2 rounded-full bg-amber-500/60" />
                      <span className="w-2 h-2 rounded-full bg-green-500/60" />
                      <span className="text-[0.6rem] text-muted-foreground ml-2 font-mono">
                        {rootName}-structure.{exportFormat === 'json' ? 'json' : 'txt'}
                      </span>
                    </div>
                    <pre className="bg-background/80 border border-border p-4 text-sm font-mono overflow-x-auto leading-relaxed min-h-[200px] max-h-[calc(100vh-440px)] overflow-y-auto text-foreground">
                      {outputText || `${rootName}/`}
                    </pre>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Button size="sm" onClick={handleCopy} className="flex-1 bg-secondary border border-border text-foreground hover:bg-muted font-mono text-xs">
                      {copied ? <><Check className="h-3.5 w-3.5 mr-1.5" />COPIED!</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />COPY TO CLIPBOARD</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={nodes.length === 0}
                      className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs">
                      <Download className="h-3.5 w-3.5 mr-1.5" />DOWNLOAD
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGenerateScript} disabled={nodes.length === 0}
                      className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs">
                      <Terminal className="h-3.5 w-3.5 mr-1.5" />SCRIPT
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
