import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

if 'ReplaceAll,' not in content:
    content = content.replace(
        "ListPlus,",
        "ListPlus,\n  ReplaceAll,"
    )

content = content.replace(
    "const [bulkAddText, setBulkAddText] = useState('')",
    "const [bulkAddText, setBulkAddText] = useState('')\n  const [showBulkRename, setShowBulkRename] = useState(false)\n  const [bulkFind, setBulkFind] = useState('')\n  const [bulkReplace, setBulkReplace] = useState('')"
)

content = content.replace(
    "bulkAddPaths",
    "bulkAddPaths,\n    bulkRename"
)

# Use useMemo for preview
content = content.replace(
    "// ─── Keyboard shortcuts ───────────────────────────────────────────────",
    "const bulkRenamePreview = useMemo(() => bulkRename(bulkFind, bulkReplace, false), [bulkFind, bulkReplace, bulkRename, nodes])\n\n  // ─── Keyboard shortcuts ───────────────────────────────────────────────"
)

search_str = """                <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>"""

replace_str = """                <Dialog open={showBulkRename} onOpenChange={setShowBulkRename}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"
                      className="border-border text-foreground hover:bg-secondary bg-transparent font-mono text-xs h-7">
                      <ReplaceAll className="h-3.5 w-3.5 mr-1" />BULK RENAME
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-card border-border crt-screen">
                    <DialogHeader>
                      <DialogTitle className="font-mono text-primary flex items-center gap-2">
                        <ReplaceAll className="h-5 w-5" /> BULK RENAME
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Find (e.g. .js)"
                          value={bulkFind}
                          onChange={(e) => setBulkFind(e.target.value)}
                          className="font-mono text-sm bg-background/50 border-border"
                        />
                        <Input
                          placeholder="Replace (e.g. .ts)"
                          value={bulkReplace}
                          onChange={(e) => setBulkReplace(e.target.value)}
                          className="font-mono text-sm bg-background/50 border-border"
                        />
                      </div>
                      <div className="text-xs font-mono text-muted-foreground border border-border p-2 rounded bg-background/50 min-h-[60px] max-h-[120px] overflow-y-auto">
                        {bulkRenamePreview.length > 0 ? (
                          <ul className="space-y-1">
                            {bulkRenamePreview.map((item) => (
                              <li key={item.id} className="flex items-center gap-2 text-foreground">
                                <span className="line-through opacity-60 text-destructive">{item.oldName}</span>
                                <span>→</span>
                                <span className="text-green-500">{item.newName}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="opacity-50">No files will be affected...</span>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowBulkRename(false)} className="font-mono text-xs">CANCEL</Button>
                      <Button
                        disabled={bulkRenamePreview.length === 0}
                        onClick={() => { bulkRename(bulkFind, bulkReplace, true); setBulkFind(''); setBulkReplace(''); setShowBulkRename(false); }}
                        className="font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                        REPLACE {bulkRenamePreview.length} ITEMS
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>"""

content = content.replace(search_str, replace_str)

# Need to highlight the affected files in the main UI tree too
# Look for DraggableTreeNodeRow inner component
row_search = "const isSelected = selectedId === node.id"
row_replace = "const isSelected = selectedId === node.id\n    const isRenameTarget = showBulkRename && bulkRenamePreview.some(p => p.id === node.id)"

content = content.replace(row_search, row_replace)

# Apply highlight in DraggableTreeNodeRow
highlight_search = "className={`flex items-center group relative cursor-pointer ${isSelected ? 'bg-secondary/50' : 'hover:bg-secondary/30'} ${isDragDropHover ? 'bg-primary/10' : ''}`}"
highlight_replace = "className={`flex items-center group relative cursor-pointer ${isSelected ? 'bg-secondary/50' : 'hover:bg-secondary/30'} ${isDragDropHover ? 'bg-primary/10' : ''} ${isRenameTarget ? 'bg-amber-500/20 ring-1 ring-amber-500/50' : ''}`}"

content = content.replace(highlight_search, highlight_replace)


with open('src/app/page.tsx', 'w') as f:
    f.write(content)
