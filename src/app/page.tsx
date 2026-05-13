'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTreeStore, generateFullTreeText, type TreeNode } from '@/lib/tree-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  TreePine,
  Eraser,
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
        className={`group flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-primary/10 ring-1 ring-primary/30'
            : 'hover:bg-muted/50'
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => selectNode(node.id)}
        onDoubleClick={handleDoubleClick}
      >
        {/* Expand/collapse toggle for folders */}
        {node.type === 'folder' ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id) }}
            className="shrink-0 p-0.5 rounded hover:bg-muted"
          >
            {node.isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Icon */}
        {node.type === 'folder' ? (
          <Folder className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <File className="h-4 w-4 text-slate-400 shrink-0" />
        )}

        {/* Name or edit input */}
        {isEditing ? (
          <Input
            ref={inputRef}
            defaultValue={node.name}
            className="h-6 text-sm py-0 px-1 flex-1 min-w-0"
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm truncate flex-1 min-w-0 select-none">
            {node.name}
            {node.type === 'folder' && '/'}
          </span>
        )}

        {/* Action buttons - show on hover or when selected */}
        <div
          className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {node.type === 'folder' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); addNode(node.id, 'folder') }}
                className="p-1 rounded hover:bg-muted"
                title="Add subfolder"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); addNode(node.id, 'file') }}
                className="p-1 rounded hover:bg-muted"
                title="Add file"
              >
                <FilePlus className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setEditingId(node.id) }}
            className="p-1 rounded hover:bg-muted"
            title="Rename"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); moveNode(node.id, 'up') }}
            className="p-1 rounded hover:bg-muted"
            title="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); moveNode(node.id, 'down') }}
            className="p-1 rounded hover:bg-muted"
            title="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }}
            className="p-1 rounded hover:bg-red-100 text-red-500"
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TreePine className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Tree Architect</h1>
              <p className="text-xs text-muted-foreground">
                Build folder structures visually — export as tree text for agents
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              <Eraser className="h-4 w-4 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>
      </header>

      {/* Import Panel */}
      {showImport && (
        <div className="border-b bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Paste an existing tree structure below to import it:
            </p>
            <textarea
              ref={textareaRef}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-32 rounded-md border bg-background p-3 text-sm font-mono resize-y"
              placeholder={`my-project/\n├── src/\n│   ├── components/\n│   └── pages/\n└── package.json`}
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleImport}>
                Import Tree
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowImport(false); setImportText('') }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Tree Builder */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Structure Builder</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addNode(null, 'folder')}
                  >
                    <FolderPlus className="h-4 w-4 mr-1.5" />
                    Folder
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addNode(null, 'file')}
                  >
                    <FilePlus className="h-4 w-4 mr-1.5" />
                    File
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground shrink-0">Root:</span>
                <Input
                  value={rootName}
                  onChange={(e) => setRootName(e.target.value)}
                  className="h-7 text-sm"
                />
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 p-2 overflow-hidden">
              <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
                {nodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Folder className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No items yet</p>
                    <p className="text-xs mt-1">
                      Click <strong>Folder</strong> or <strong>File</strong> above to start building
                    </p>
                    <p className="text-xs mt-0.5">
                      Hover any item to see actions — add children, rename, reorder, delete
                    </p>
                  </div>
                ) : (
                  <div className="py-1">
                    <div className="flex items-center gap-1.5 py-1 px-2 mb-1">
                      <Folder className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold">{rootName}/</span>
                    </div>
                    {nodes.map((node) => (
                      <TreeNodeRow key={node.id} node={node} depth={1} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right: Output */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tree Output</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOutput(!showOutput)}
                  >
                    {showOutput ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 p-4">
              {showOutput && (
                <>
                  <div className="relative">
                    <pre className="bg-zinc-950 text-green-400 rounded-lg p-4 text-sm font-mono overflow-x-auto leading-relaxed min-h-[200px] max-h-[calc(100vh-380px)] overflow-y-auto">
                      {treeText || `${rootName}/`}
                    </pre>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={handleCopy}
                      className="flex-1"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-1.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1.5" />
                          Copy to Clipboard
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      disabled={nodes.length === 0}
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      Download .txt
                    </Button>
                  </div>

                  {/* Tips */}
                  <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                    <h3 className="text-sm font-semibold mb-2">Tips</h3>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">1.</span>
                        Click an item to select it, then use hover actions to manage it
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">2.</span>
                        Double-click any item to rename it inline
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">3.</span>
                        On folders, hover to reveal &quot;Add subfolder&quot; and &quot;Add file&quot; buttons
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">4.</span>
                        Use ↑↓ arrows to reorder siblings within the same level
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">5.</span>
                        Import existing tree text to edit it visually
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
