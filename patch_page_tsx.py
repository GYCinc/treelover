import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Add bulkAddPaths and bulkRename to the destruction block correctly
search_str = "expandAll, collapseAll, applyAiTree, originalSnapshot,"
replace_str = "expandAll, collapseAll, applyAiTree, originalSnapshot, bulkAddPaths, bulkRename,"

content = content.replace(search_str, replace_str)

# Fix the broken onClick for bulkAddPaths
search_str2 = "<Button onClick={() => { bulkAddPaths,\n    bulkRename(bulkAddText); setBulkAddText(''); setShowBulkAdd(false); }}"
replace_str2 = "<Button onClick={() => { bulkAddPaths(bulkAddText); setBulkAddText(''); setShowBulkAdd(false); }}"

content = content.replace(search_str2, replace_str2)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
