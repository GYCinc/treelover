import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Add Palette to imports
if 'Palette,' not in content:
    content = content.replace(
        "FolderArchive,",
        "FolderArchive,\n  Palette,"
    )

if 'Popover,' not in content:
    content = content.replace(
        "import { ScrollArea } from '@/components/ui/scroll-area'",
        "import { ScrollArea } from '@/components/ui/scroll-area'\nimport { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'"
    )

# Add setNodeColor to destructured state
content = content.replace(
    "flattenFolder, groupByExtension,",
    "flattenFolder, groupByExtension, setNodeColor,"
)

# Render color logic
search_str = """className={`flex items-center group relative cursor-pointer ${isSelected ? 'bg-secondary/50' : 'hover:bg-secondary/30'} ${isDragDropHover ? 'bg-primary/10' : ''} ${isRenameTarget ? 'bg-amber-500/20 ring-1 ring-amber-500/50' : ''}`}"""

replace_str = """className={`flex items-center group relative cursor-pointer ${isSelected ? 'bg-secondary/50' : 'hover:bg-secondary/30'} ${isDragDropHover ? 'bg-primary/10' : ''} ${isRenameTarget ? 'bg-amber-500/20 ring-1 ring-amber-500/50' : ''}`}
        style={node.color ? { backgroundColor: `${node.color}20`, borderLeft: `2px solid ${node.color}` } : {}}"""

content = content.replace(search_str, replace_str)

# Add color picker button to node actions
row_search = """              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }} title="Delete">
                <Trash2 className="h-3 w-3" />
              </Button>"""

row_replace = """              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => e.stopPropagation()} title="Color">
                    <Palette className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-card border-border flex gap-1" align="start" onClick={(e) => e.stopPropagation()}>
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', undefined].map((c, i) => (
                    <button key={i} onClick={(e) => { e.stopPropagation(); setNodeColor(node.id, c) }}
                      className="w-5 h-5 rounded hover:scale-110 transition-transform flex items-center justify-center border border-border"
                      style={c ? { backgroundColor: c } : { background: 'transparent' }}>
                      {!c && <X className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }} title="Delete">
                <Trash2 className="h-3 w-3" />
              </Button>"""

content = content.replace(row_search, row_replace)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
