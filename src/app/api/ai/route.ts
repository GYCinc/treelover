import { NextRequest, NextResponse } from 'next/server'

interface TreeNodeDTO {
  name: string
  type: 'folder' | 'file'
  children: TreeNodeDTO[]
}

export async function POST(req: NextRequest) {
  try {
    const { tree, rootName, prompt } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'DEEPSEEK_API_KEY not configured' }, { status: 500 })
    }

    const systemPrompt = `You are a folder structure architect. You receive a JSON tree and a user instruction. You respond with ONLY the modified tree JSON — no explanations, no markdown, no code fences, no chat.

Rules:
- Each node: { "name": string, "type": "folder" | "file", "children": [] }
- Files have empty children array
- Folders can have children
- Keep the root name as the top-level key
- Respond with valid JSON only, nothing else
- Be concise and practical — real-world project structures
- If the user asks to "add X", add X to the existing tree, don't remove other things
- If the user asks to "reorganize", restructure sensibly
- If the user asks to "suggest", propose a better structure based on the prompt
- Never add comments or explanations, only pure JSON`

    const userContent = `Current root name: ${rootName || 'my-project'}

Current tree:
${JSON.stringify(tree, null, 2)}

Instruction: ${prompt}

Respond with the complete modified tree as JSON. Format: { "rootName": "...", "nodes": [ ... ] }`

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `DeepSeek API error: ${response.status}`, details: errorText },
        { status: 502 }
      )
    }

    const completion = await response.json()
    let text = completion.choices?.[0]?.message?.content || ''

    // Strip markdown code fences if the model wraps them
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: text }, { status: 502 })
    }

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
