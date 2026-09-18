import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Add the buttons next to FolderPlus and FilePlus for folders
search_str = """                  <button onClick={(e) => { e.stopPropagation(); addNode(node.id, 'folder') }} className="p-1 rounded hover:bg-secondary text-accent" title="Add subfolder"><FolderPlus className="h-3.5 w-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); addNode(node.id, 'file') }} className="p-1 rounded hover:bg-secondary text-foreground" title="Add file"><FilePlus className="h-3.5 w-3.5" /></button>"""

replace_str = """                  <button onClick={(e) => { e.stopPropagation(); addNode(node.id, 'folder') }} className="p-1 rounded hover:bg-secondary text-accent" title="Add subfolder"><FolderPlus className="h-3.5 w-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); addNode(node.id, 'file') }} className="p-1 rounded hover:bg-secondary text-foreground" title="Add file"><FilePlus className="h-3.5 w-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); sortNodes(node.id) }} className="p-1 rounded hover:bg-secondary text-primary" title="Sort Folder"><ArrowDownAZ className="h-3.5 w-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); flattenFolder(node.id) }} className="p-1 rounded hover:bg-secondary text-primary" title="Flatten Folder"><AlignVerticalSpaceAround className="h-3.5 w-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); groupByExtension(node.id) }} className="p-1 rounded hover:bg-secondary text-primary" title="Group by Extension"><FolderArchive className="h-3.5 w-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); cloneStructure(node.id) }} className="p-1 rounded hover:bg-secondary text-primary" title="Clone Structure (No Files)"><FolderSync className="h-3.5 w-3.5" /></button>"""

content = content.replace(search_str, replace_str)

# Also add the color picker next to Move up / Move down for both file and folder
search_str2 = """              <button onClick={(e) => { e.stopPropagation(); moveNode(node.id, 'down') }} className="p-1 rounded hover:bg-secondary text-muted-foreground" title="Move down"><ArrowDown className="h-3 w-3" /></button>
            </>
          )}"""

replace_str2 = """              <button onClick={(e) => { e.stopPropagation(); moveNode(node.id, 'down') }} className="p-1 rounded hover:bg-secondary text-muted-foreground" title="Move down"><ArrowDown className="h-3 w-3" /></button>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1 rounded hover:bg-secondary text-foreground" onClick={(e) => e.stopPropagation()} title="Color"><Palette className="h-3.5 w-3.5" /></button>
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
            </>
          )}"""

content = content.replace(search_str2, replace_str2)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
