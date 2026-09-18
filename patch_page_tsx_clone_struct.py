import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Add FolderSync to imports
if 'FolderSync,' not in content:
    content = content.replace(
        "Palette,",
        "Palette,\n  FolderSync,"
    )

# Add cloneStructure to useTreeStore destruction in DraggableTreeNodeRow
content = content.replace(
    "flattenFolder, groupByExtension, setNodeColor,",
    "flattenFolder, groupByExtension, setNodeColor, cloneStructure,"
)

# Add button to folder actions
row_search = """              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); duplicateNode(node.id) }} title="Duplicate">
                <Copy className="h-3 w-3" />
              </Button>"""

row_replace = """              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); cloneStructure(node.id) }} title="Clone Structure (No Files)">
                <FolderSync className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); duplicateNode(node.id) }} title="Duplicate">
                <Copy className="h-3 w-3" />
              </Button>"""

# Since duplicateNode button exists multiple times (files and folders), we need to replace specifically the one in folder actions.
# Actually, the file action doesn't have the FolderSync, so we only want to put it if node.type === 'folder'
# Let's see the render block.

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
