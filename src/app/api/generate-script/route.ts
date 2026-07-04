import { NextRequest, NextResponse } from 'next/server'

interface TreeNode {
  id?: string
  name: string
  type: 'folder' | 'file'
  children: TreeNode[]
}

interface ScriptRequest {
  rootName: string
  nodes: TreeNode[]
  sourcePath?: string // Original directory path
  originalSnapshot?: {
    rootName: string
    nodes: TreeNode[]
  } | null
}

function buildPathMap(
  nodes: TreeNode[],
  currentPath: string = '',
  map: Map<string, string> = new Map()
): Map<string, string> {
  for (const node of nodes) {
    const relativePath = currentPath ? `${currentPath}/${node.name}` : node.name
    if (node.id) {
      map.set(node.id, relativePath)
    }
    if (node.type === 'folder' && node.children && node.children.length > 0) {
      buildPathMap(node.children, relativePath, map)
    }
  }
  return map
}

function collectNodeIds(nodes: TreeNode[], set: Set<string> = new Set()): Set<string> {
  for (const node of nodes) {
    if (node.id) {
      set.add(node.id)
    }
    if (node.type === 'folder' && node.children && node.children.length > 0) {
      collectNodeIds(node.children, set)
    }
  }
  return set
}

function findDeletedFiles(
  originalNodes: TreeNode[],
  targetNodeIds: Set<string>,
  currentPath: string = ''
): string[] {
  const deleted: string[] = []
  for (const node of originalNodes) {
    const relativePath = currentPath ? `${currentPath}/${node.name}` : node.name
    if (node.type === 'file') {
      if (!node.id || !targetNodeIds.has(node.id)) {
        deleted.push(relativePath)
      }
    } else if (node.type === 'folder' && node.children && node.children.length > 0) {
      deleted.push(...findDeletedFiles(node.children, targetNodeIds, relativePath))
    }
  }
  return deleted
}

function generateCommands(
  nodes: TreeNode[],
  rootName: string,
  sourcePath: string,
  currentPath: string = ''
): string[] {
  const lines: string[] = []

  for (const node of nodes) {
    const relativePath = currentPath ? `${currentPath}/${node.name}` : node.name

    if (node.type === 'folder') {
      lines.push(`mkdir -p "${rootName}/${relativePath}"`)
      if (node.children && node.children.length > 0) {
        lines.push(...generateCommands(node.children, rootName, sourcePath, relativePath))
      }
    } else {
      const src = `${sourcePath}/${relativePath}`
      const dst = `${rootName}/${relativePath}`
      // Only move if source exists (user will edit path)
      lines.push(`if [ -f "${src}" ]; then mv "${src}" "${dst}"; else echo "MISSING: ${src}"; fi`)
    }
  }

  return lines
}

function generateTransitionCommands(
  nodes: TreeNode[],
  rootName: string,
  sourcePath: string,
  origPathMap: Map<string, string>,
  currentPath: string = ''
): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    const relativePath = currentPath ? `${currentPath}/${node.name}` : node.name

    if (node.type === 'folder') {
      lines.push(`mkdir -p "${rootName}/${relativePath}"`)
      if (node.children && node.children.length > 0) {
        lines.push(...generateTransitionCommands(node.children, rootName, sourcePath, origPathMap, relativePath))
      }
    } else {
      const dst = `${rootName}/${relativePath}`
      const origPath = node.id ? origPathMap.get(node.id) : null
      if (origPath) {
        const src = `${sourcePath}/${origPath}`
        lines.push(`if [ -f "${src}" ]; then mv "${src}" "${dst}"; else echo "MISSING: ${src}"; fi`)
      } else {
        lines.push(`touch "${dst}"`)
      }
    }
  }
  return lines
}

function generateCleanup(
  nodes: TreeNode[],
  sourcePath: string,
  currentPath: string = ''
): string[] {
  const lines: string[] = []

  for (const node of nodes) {
    const relativePath = currentPath ? `${currentPath}/${node.name}` : node.name
    const fullPath = `${sourcePath}/${relativePath}`

    if (node.type === 'folder') {
      if (node.children && node.children.length > 0) {
        lines.push(...generateCleanup(node.children, sourcePath, relativePath))
      }
      lines.push(`rmdir "${fullPath}" 2>/dev/null || true`)
    }
  }

  return lines
}

function generateDryRun(
  nodes: TreeNode[],
  rootName: string,
  currentPath: string = '',
  prefix: string = ''
): string[] {
  const lines: string[] = []

  for (const node of nodes) {
    const relativePath = currentPath ? `${currentPath}/${node.name}` : node.name

    if (node.type === 'folder') {
      lines.push(`${prefix}[DIR]  ${rootName}/${relativePath}`)
      if (node.children && node.children.length > 0) {
        lines.push(...generateDryRun(node.children, rootName, relativePath, prefix + '  '))
      }
    } else {
      lines.push(`${prefix}[FILE] ${rootName}/${relativePath}`)
    }
  }

  return lines
}

export async function POST(req: NextRequest) {
  try {
    const { rootName, nodes, sourcePath = '/path/to/source', originalSnapshot } = await req.json()

    if (!rootName || !Array.isArray(nodes)) {
      return NextResponse.json({ error: 'rootName and nodes[] required' }, { status: 400 })
    }

    const safeRoot = rootName.replace(/[^a-zA-Z0-9_-]/g, '_')

    const hasOriginal = !!originalSnapshot && Array.isArray(originalSnapshot.nodes)
    let origPathMap = new Map<string, string>()
    let deletedFiles: string[] = []

    if (hasOriginal) {
      origPathMap = buildPathMap(originalSnapshot.nodes)
      const targetNodeIds = collectNodeIds(nodes)
      deletedFiles = findDeletedFiles(originalSnapshot.nodes, targetNodeIds)
    }

    const lines: string[] = [
      '#!/bin/bash',
      '#',
      `# Directory Reorganization Script`,
      `# Generated by tree_Lover`,
      `#`,
      `# BEFORE RUNNING:`,
      `# 1. Review this script carefully`,
      `# 2. Set SOURCE_PATH to your actual source directory`,
      `# 3. Run with: bash reorganize.sh`,
      `#`,
      `set -euo pipefail`,
      ``,
      `SOURCE_PATH="${sourcePath}"`,
      `TARGET_ROOT="${safeRoot}"`,
      ``,
      `echo "=== DRY RUN ==="`,
      `echo "Target structure:"`,
      ...generateDryRun(nodes, '${TARGET_ROOT}').map(l => `echo "${l}"`),
    ]

    if (hasOriginal) {
      lines.push(
        ``,
        `echo "Deleted files (will remain in source or be lost if source is deleted):"`,
        ...(deletedFiles.length > 0 ? deletedFiles.map(f => `echo " - ${f}"`) : [`echo "None"`])
      )
    }

    lines.push(
      ``,
      `echo ""`,
      `echo "Press Enter to continue or Ctrl+C to abort..."`,
      `read -r`,
      ``,
      `echo "=== CREATING TARGET STRUCTURE ==="`
    )

    if (hasOriginal) {
      lines.push(...generateTransitionCommands(nodes, '${TARGET_ROOT}', '${SOURCE_PATH}', origPathMap))
    } else {
      lines.push(...generateCommands(nodes, '${TARGET_ROOT}', '${SOURCE_PATH}'))
    }

    lines.push(
      ``,
      `echo "=== CLEANUP EMPTY DIRS ==="`
    )

    if (hasOriginal) {
      lines.push(...generateCleanup(originalSnapshot.nodes, '${SOURCE_PATH}'))
    } else {
      lines.push(...generateCleanup(nodes, '${SOURCE_PATH}'))
    }

    lines.push(
      ``,
      `echo "Done. Review \${TARGET_ROOT}/ for results."`
    )

    return NextResponse.json({
      script: lines.join('\n'),
      filename: `reorganize-${safeRoot}.sh`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
