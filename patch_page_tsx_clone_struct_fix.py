import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Revert previous bad replace and do it right
# Ah wait, let's see what the action bar in DraggableTreeNodeRow looks like

search_str = """              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); groupByExtension(node.id) }} title="Group by Extension">
                <FolderArchive className="h-3 w-3" />
              </Button>"""

replace_str = """              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); groupByExtension(node.id) }} title="Group by Extension">
                <FolderArchive className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" onClick={(e) => { e.stopPropagation(); cloneStructure(node.id) }} title="Clone Structure (No Files)">
                <FolderSync className="h-3 w-3" />
              </Button>"""

content = content.replace(search_str, replace_str)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
