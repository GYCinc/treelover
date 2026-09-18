import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Add ArrowDownAZ to imports
if 'ArrowDownAZ,' not in content:
    content = content.replace(
        "ReplaceAll,",
        "ReplaceAll,\n  ArrowDownAZ,"
    )

# Add sortNodes to useTreeStore destruction
content = content.replace(
    "bulkRename,",
    "bulkRename,\n    sortNodes,"
)

# Add Sort button to Global Toolbar (next to Expand/Collapse All)
search_str = """                <span className="w-px h-4 bg-border/40" />
                <Button variant="outline" size="sm" onClick={() => addNode(null, 'folder')}"""

replace_str = """                <Button variant="outline" size="sm" onClick={() => sortNodes(null)}
                  className="border-border text-foreground hover:bg-secondary bg-transparent h-7 w-7 p-0" title="Sort all">
                  <ArrowDownAZ className="h-3.5 w-3.5" />
                </Button>
                <span className="w-px h-4 bg-border/40" />
                <Button variant="outline" size="sm" onClick={() => addNode(null, 'folder')}"""

content = content.replace(search_str, replace_str)

# Add Sort button to Folder actions in DraggableTreeNodeRow
row_search = """              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); duplicateNode(node.id) }} title="Duplicate">
                <Copy className="h-3 w-3" />
              </Button>"""

row_replace = """              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); sortNodes(node.id) }} title="Sort">
                <ArrowDownAZ className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); duplicateNode(node.id) }} title="Duplicate">
                <Copy className="h-3 w-3" />
              </Button>"""

content = content.replace(row_search, row_replace)

# We need to destruct sortNodes inside DraggableTreeNodeRow
dr_search = "setEditingId, addNode, moveNode, moveNodeTo, setMovingId, cancelMove, duplicateNode,"
dr_replace = "setEditingId, addNode, moveNode, moveNodeTo, setMovingId, cancelMove, duplicateNode, sortNodes,"
content = content.replace(dr_search, dr_replace)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
