import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Add AlignVerticalSpaceAround and FolderArchive to imports
if 'AlignVerticalSpaceAround,' not in content:
    content = content.replace(
        "ArrowDownAZ,",
        "ArrowDownAZ,\n  AlignVerticalSpaceAround,\n  FolderArchive,"
    )

# Add flattenFolder and groupByExtension to useTreeStore destruction in DraggableTreeNodeRow
content = content.replace(
    "setEditingId, addNode, moveNode, moveNodeTo, setMovingId, cancelMove, duplicateNode, sortNodes,",
    "setEditingId, addNode, moveNode, moveNodeTo, setMovingId, cancelMove, duplicateNode, sortNodes, flattenFolder, groupByExtension,"
)

# Add buttons to folder actions
row_search = """              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); sortNodes(node.id) }} title="Sort">
                <ArrowDownAZ className="h-3 w-3" />
              </Button>"""

row_replace = """              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); sortNodes(node.id) }} title="Sort">
                <ArrowDownAZ className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); flattenFolder(node.id) }} title="Flatten Folder">
                <AlignVerticalSpaceAround className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); groupByExtension(node.id) }} title="Group by Extension">
                <FolderArchive className="h-3 w-3" />
              </Button>"""

content = content.replace(row_search, row_replace)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
