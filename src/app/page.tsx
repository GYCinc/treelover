'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTreeStore, generateFullTreeText, type TreeNode } from '@/lib/tree-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
} from 'lucide-react'

// ─── Tree Node Component ────────────────────────────────────────────────

function TreeNodeRow({
  node,
  depth,
}: {
  node: TreeNode
  depth: number
}) {
  const {
    selectedId,
    editingId,
    selectNode,
    toggleExpand,
    deleteNode,
    renameNode,
    setEditingId,
    addNode,
    moveNode,
  } = useTreeStore()

  const isSelected = selectedId === node.id
  const isEditing = editingId === node.id
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = () => {
    setEditingId(node.id)
  }

  const handleRenameSubmit = () => {
    const val = inputRef.current?.value.trim()
    if (val) renameNode(node.id, val)
    else setEditingId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') setEditingId(null)
  }

  return (
    <>
      <div
        className={`group flex items-center gap-1 py-0.5 px-2 cursor-pointer transition-colors ${
          isSelected
            ? 'bg-green-900/30 ring-1 ring-green-500/40'
            : 'hover:bg-green-900/15'
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => selectNode(node.id)}
        onDoubleClick={handleDoubleClick}
      >
        {/* Expand/collapse toggle for folders */}
        {node.type === 'folder' ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id) }}
            className="shrink-0 p-0.5 rounded hover:bg-green-900/30 text-green-400"
          >
            {node.isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Icon */}
        {node.type === 'folder' ? (
          <Folder className="h-4 w-4 text-amber-400 shrink-0" />
        ) : (
          <File className="h-4 w-4 text-green-500/60 shrink-0" />
        )}

        {/* Name or edit input */}
        {isEditing ? (
          <Input
            ref={inputRef}
            defaultValue={node.name}
            className="h-6 text-sm py-0 px-1 flex-1 min-w-0 bg-black/60 border-green-600/50 text-green-300 focus:border-amber-500"
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm truncate flex-1 min-w-0 select-none glow-green">
            {node.name}
            {node.type === 'folder' && <span className="text-green-600">/</span>}
          </span>
        )}

        {/* Action buttons */}
        <div
          className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {node.type === 'folder' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); addNode(node.id, 'folder') }}
                className="p-1 rounded hover:bg-green-900/40 text-amber-400"
                title="Add subfolder"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); addNode(node.id, 'file') }}
                className="p-1 rounded hover:bg-green-900/40 text-green-400"
                title="Add file"
              >
                <FilePlus className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setEditingId(node.id) }}
            className="p-1 rounded hover:bg-green-900/40 text-green-300"
            title="Rename"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); moveNode(node.id, 'up') }}
            className="p-1 rounded hover:bg-green-900/40 text-green-500"
            title="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); moveNode(node.id, 'down') }}
            className="p-1 rounded hover:bg-green-900/40 text-green-500"
            title="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }}
            className="p-1 rounded hover:bg-red-900/40 text-red-400"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      {node.type === 'folder' && node.isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function Home() {
  const {
    rootName,
    nodes,
    setRootName,
    addNode,
    clearAll,
    importTree,
  } = useTreeStore()

  const [copied, setCopied] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [showOutput, setShowOutput] = useState(true)

  const treeText = generateFullTreeText(rootName, nodes)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(treeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [treeText])

  const handleDownload = useCallback(() => {
    const blob = new Blob([treeText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${rootName}-structure.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [treeText, rootName])

  const handleImport = useCallback(() => {
    if (importText.trim()) {
      importTree(importText)
      setImportText('')
      setShowImport(false)
    }
  }, [importText, importTree])

  return (
    <div className="min-h-screen bg-[#0c0f0c] crt-flicker patina-grid">
      {/* CRT overlay effects */}
      <div className="crt-scanlines" />
      <div className="crt-scanline-bar" />
      <div className="crt-vignette" />

      {/* Header */}
      <header className="border-b border-green-800/60 bg-[#0a0d0a]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-amber-700/50 rounded bg-amber-900/20">
              <Terminal className="h-5 w-5 text-amber-400 glow-amber-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-widest uppercase text-amber-400 glow-amber">
                TREE ARCHITECT
              </h1>
              <p className="text-[0.65rem] text-green-600 tracking-wider uppercase">
                Visual folder structure builder &gt; export for agents
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImport(!showImport)}
              className="border-green-700/50 text-green-400 hover:bg-green-900/30 hover:text-green-300 bg-transparent font-mono text-xs"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              IMPORT
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="border-red-800/50 text-red-400 hover:bg-red-900/30 hover:text-red-300 bg-transparent font-mono text-xs"
            >
              <Eraser className="h-3.5 w-3.5 mr-1.5" />
              CLEAR
            </Button>
          </div>
        </div>
      </header>

      {/* Import Panel */}
      {showImport && (
        <div className="border-b border-green-800/40 bg-[#0a0d0a]">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <p className="text-xs text-green-500 mb-2 glow-green font-mono">
              {'>'} PASTE EXISTING TREE STRUCTURE BELOW:
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-32 border border-green-800/50 bg-black/60 p-3 text-sm font-mono resize-y text-green-400 glow-green placeholder:text-green-800 focus:border-amber-600/50 focus:outline-none"
              placeholder={`my-project/\n├── src/\n│   ├── components/\n│   └── pages/\n└── package.json`}
            />
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={handleImport}
                className="bg-amber-700/40 border border-amber-600/50 text-amber-300 hover:bg-amber-700/60 font-mono text-xs"
              >
                {'>'} IMPORT
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowImport(false); setImportText('') }}
                className="text-green-600 hover:text-green-400 hover:bg-green-900/20 font-mono text-xs"
              >
                [CANCEL]
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Tree Builder */}
          <div className="terminal-border crt-screen bg-[#0a0d0a] flex flex-col">
            {/* Title bar */}
            <div className="px-4 py-2.5 border-b border-green-800/50 flex items-center justify-between bg-[#080b08]">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-bold tracking-widest uppercase text-amber-400 glow-amber">
                  STRUCTURE BUILDER
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode(null, 'folder')}
                  className="border-amber-700/50 text-amber-400 hover:bg-amber-900/30 hover:text-amber-300 bg-transparent font-mono text-xs h-7"
                >
                  <FolderPlus className="h-3.5 w-3.5 mr-1" />
                  FOLDER
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode(null, 'file')}
                  className="border-green-700/50 text-green-400 hover:bg-green-900/30 hover:text-green-300 bg-transparent font-mono text-xs h-7"
                >
                  <FilePlus className="h-3.5 w-3.5 mr-1" />
                  FILE
                </Button>
              </div>
            </div>

            {/* Root name input */}
            <div className="px-4 py-2 border-b border-green-900/40 flex items-center gap-2">
              <span className="text-[0.65rem] text-green-600 font-mono tracking-wider">ROOT:</span>
              <Input
                value={rootName}
                onChange={(e) => setRootName(e.target.value)}
                className="h-6 text-sm font-mono bg-black/40 border-green-800/40 text-green-300 glow-green focus:border-amber-600/50 px-2"
              />
            </div>

            {/* Tree content */}
            <div className="flex-1 p-1 overflow-hidden">
              <ScrollArea className="h-[calc(100vh-300px)] min-h-[280px]">
                {nodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-green-700">
                    <Folder className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm font-mono glow-green tracking-wider">NO ITEMS LOADED</p>
                    <p className="text-[0.65rem] mt-1 font-mono text-green-800">
                      Click FOLDER or FILE above to begin
                    </p>
                    <p className="text-[0.65rem] mt-0.5 font-mono text-green-800">
                      Hover items for actions: add, rename, reorder, delete
                    </p>
                  </div>
                ) : (
                  <div className="py-1">
                    <div className="flex items-center gap-1.5 py-1 px-2 mb-1">
                      <Folder className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-bold text-amber-400 glow-amber tracking-wide">{rootName}/</span>
                    </div>
                    {nodes.map((node) => (
                      <TreeNodeRow key={node.id} node={node} depth={1} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Right: Output */}
          <div className="terminal-border-amber crt-screen bg-[#0a0d0a] flex flex-col">
            {/* Title bar */}
            <div className="px-4 py-2.5 border-b border-amber-800/40 flex items-center justify-between bg-[#080b08]">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs font-bold tracking-widest uppercase text-green-400 glow-green">
                  TREE OUTPUT
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOutput(!showOutput)}
                className="border-green-800/40 text-green-500 hover:bg-green-900/30 bg-transparent font-mono text-xs h-7"
              >
                {showOutput ? '[HIDE]' : '[SHOW]'}
              </Button>
            </div>

            {/* Output content */}
            <div className="flex-1 p-4">
              {showOutput && (
                <>
                  <div className="relative">
                    {/* Terminal window chrome */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-red-500/60" />
                      <span className="w-2 h-2 rounded-full bg-amber-500/60" />
                      <span className="w-2 h-2 rounded-full bg-green-500/60" />
                      <span className="text-[0.6rem] text-green-700 ml-2 font-mono">{rootName}-structure.txt</span>
                    </div>
                    <pre className="bg-black/70 border border-green-900/40 p-4 text-sm font-mono overflow-x-auto leading-relaxed min-h-[200px] max-h-[calc(100vh-420px)] overflow-y-auto text-green-400 glow-green">
                      {treeText || `${rootName}/`}
                    </pre>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={handleCopy}
                      className="flex-1 bg-green-900/40 border border-green-700/50 text-green-300 hover:bg-green-800/50 font-mono text-xs glow-green"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          COPIED!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          COPY TO CLIPBOARD
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      disabled={nodes.length === 0}
                      className="border-amber-700/50 text-amber-400 hover:bg-amber-900/30 bg-transparent font-mono text-xs"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      DOWNLOAD
                    </Button>
                  </div>

                  {/* Tips */}
                  <div className="mt-6 border border-green-900/30 bg-black/40 p-4">
                    <h3 className="text-xs font-bold tracking-widest uppercase text-amber-400 glow-amber mb-3">
                      {'>'} QUICK REFERENCE
                    </h3>
                    <ul className="text-[0.65rem] text-green-600 space-y-1.5 font-mono">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">01</span>
                        Click item to select, hover for action buttons
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">02</span>
                        Double-click any item to rename inline
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">03</span>
                        Folders show add subfolder / add file on hover
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">04</span>
                        Use arrows to reorder siblings at same level
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">05</span>
                        Import existing tree text to edit visually
                      </li>
                    </ul>
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
