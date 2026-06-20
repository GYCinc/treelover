import { readdirSync, statSync } from 'fs'
import { join } from 'path'

interface TreeNode {
  name: string
  type: 'folder' | 'file'
  children: TreeNode[]
}

function scanDir(dirPath: string): TreeNode[] {
  const entries = readdirSync(dirPath)
  const nodes: TreeNode[] = []

  for (const entry of entries) {
    if (entry.startsWith('.') && entry !== '.github' && entry !== '.vscode') continue
    const fullPath = join(dirPath, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      nodes.push({
        name: entry,
        type: 'folder',
        children: scanDir(fullPath),
      })
    } else {
      nodes.push({ name: entry, type: 'file', children: [] })
    }
  }

  // Sort: folders first, then files, both alphabetical
  nodes.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name)
    return a.type === 'folder' ? -1 : 1
  })

  return nodes
}

const targetDir = process.argv[2]

if (!targetDir) {
  console.error('Usage: bun run scripts/scan-dir.ts <path-to-directory>')
  process.exit(1)
}

const rootName = targetDir.split('/').pop() || 'project'
const tree = scanDir(targetDir)

const output = JSON.stringify({ rootName, nodes: tree }, null, 2)
console.log(output)
