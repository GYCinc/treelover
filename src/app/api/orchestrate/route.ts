import { NextRequest, NextResponse } from 'next/server'

interface TreeNodeDTO {
  name: string
  type: 'folder' | 'file'
  children: TreeNodeDTO[]
}

interface AgentResult {
  agent: string
  output: string
  confidence: number
}

const API_KEY = process.env.DEEPSEEK_API_KEY
const BASE_URL = 'https://api.deepseek.com/v1/chat/completions'
const MODEL = 'deepseek-chat'

async function callAgent(
  name: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AgentResult> {
  if (!API_KEY) {
    return { agent: name, output: 'DEEPSEEK_API_KEY not set', confidence: 0 }
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    return { agent: name, output: `API error ${res.status}: ${text}`, confidence: 0 }
  }

  const json = await res.json()
  const output = json.choices?.[0]?.message?.content || ''

  // Simple confidence heuristic: longer structured output = higher confidence
  const confidence = output.includes('"name"') && output.includes('"type"') ? 0.9 : 0.5

  return { agent: name, output, confidence }
}

export async function POST(req: NextRequest) {
  try {
    const { tree, rootName, prompt } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const treeJson = JSON.stringify(tree, null, 2)

    // Run 3 agents in parallel
    const [analyzer, architect, verifier] = await Promise.all([
      callAgent(
        'analyzer',
        'You are a filesystem analyst. Identify structural problems, inconsistencies, and anti-patterns in directory trees. Be concise. Respond in bullet points.',
        `Analyze this directory tree and identify problems or areas for improvement:

Root: ${rootName || 'project'}
Tree:
${treeJson}

User request: ${prompt}

List specific issues (nesting too deep, mixed concerns, missing standard folders, etc.).`
      ),

      callAgent(
        'architect',
        `You are a folder structure architect. You receive a JSON tree and a user instruction. You respond with ONLY the modified tree JSON — no explanations, no markdown, no code fences.

Rules:
- Each node: { "name": string, "type": "folder" | "file", "children": [] }
- Files have empty children array
- Folders can have children
- Respond with valid JSON only, nothing else
- Format: { "rootName": "...", "nodes": [ ... ] }
- Be practical and follow real-world conventions`,
        `Current root name: ${rootName || 'my-project'}

Current tree:
${treeJson}

Instruction: ${prompt}

Respond with the complete modified tree as JSON.`
      ),

      callAgent(
        'verifier',
        'You are a safety verifier. Check directory tree proposals for data loss risks, broken references, and logical errors. Respond with ONLY a JSON object: { "safe": boolean, "issues": string[], "confidence": number }',
        `Original tree root: ${rootName || 'my-project'}

User request: ${prompt}

Check if reorganizing this tree could cause any problems (lost files, broken imports, confusing nesting). Respond with JSON only.`
      ),
    ])

    // Strip fences from architect output
    let architectText = architect.output
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()

    let proposedTree
    try {
      proposedTree = JSON.parse(architectText)
    } catch {
      proposedTree = null
    }

    // Parse verifier JSON
    let verification = { safe: false, issues: ['Could not parse verifier output'], confidence: 0 }
    try {
      const vText = verifier.output
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim()
      verification = JSON.parse(vText)
    } catch {
      // keep default
    }

    return NextResponse.json({
      analysis: analyzer.output,
      proposed: proposedTree,
      verification,
      meta: {
        analyzerConfidence: analyzer.confidence,
        architectConfidence: architect.confidence,
        verifierConfidence: verifier.confidence,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
