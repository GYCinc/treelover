---
name: llm-wiki-setup
description: "Interactive setup for an LLM Wiki knowledge base. Use this skill whenever the user wants to create a wiki, knowledge base, second brain, personal wiki, project documentation system, note-taking system, or any Markdown-based knowledge management setup — whether for a software project, personal research, private investigation, creative writing, job search, or any other domain. Also trigger when the user mentions Karpathy's LLM Wiki, AGENTS.md schema, QMD, SIGMA Guard, or asks about building a 'librarian' agent for their notes. The skill interviews the user about their project type, evaluates custom categories, and generates a complete wiki scaffold with a tailored AGENTS.md, directory structure, and MCP configuration."
---

# LLM Wiki Setup Skill

You are setting up an **LLM Wiki** — a Markdown-based knowledge base where an LLM agent acts as the librarian. The system follows the v3.1 architecture:

- **MCP for structure** (QMD owns the index, SIGMA Guard for on-demand audits)
- **Markdown for content** (atomic page writes)
- **Git for history** (no log.md, use git log)

## The Interview Process

Before generating anything, you MUST interview the user. Ask the questions below one section at a time. Wait for answers before moving to the next section. Adapt your follow-up questions based on what the user reveals.

### Section 1: Project Identity

Ask these questions:

1. **What is this wiki for?** (e.g., software project, personal research, private investigation, creative writing worldbuilding, job search tracking, health management, investment portfolio, client case files, etc.)
2. **What's the project name?** (used for the wiki root directory and AGENTS.md header)
3. **Who is the primary user?** (just you, a small team, a client, etc.)

### Section 2: Content Categories

Start by presenting the **standard categories** and explain what each holds:

| Category | Purpose |
|----------|---------|
| `pages/` | Topical pages — the main knowledge articles |
| `concepts/` | Definitions, explanations of key terms and ideas |
| `people/` | Profiles, contact info, relationship notes |
| `sources/` | Raw input files (READ-ONLY for the agent) |

Then ask:

4. **Do any of these standard categories NOT apply?** (e.g., a solo developer might not need `people/`; a private investigator absolutely would)
5. **What custom categories do you need?** Think about the types of content specific to your domain. Here are examples to spark thinking:

| Domain | Possible Custom Categories |
|--------|---------------------------|
| Software dev | `api/`, `architecture/`, `incidents/`, `runbooks/` |
| Private investigation | `cases/`, `evidence/`, `surveillance/`, `timeline/`, `subjects/` |
| Creative writing | `characters/`, `locations/`, `lore/`, `chapters/`, `plotlines/` |
| Job search | `applications/`, `interviews/`, `companies/`, `skills/` |
| Health management | `symptoms/`, `treatments/`, `providers/`, `medications/`, `labs/` |
| Investment | `holdings/`, `research/`, `trades/`, `thesis/` |
| Legal practice | `clients/`, `matters/`, `statutes/`, `precedents/` |
| Academic research | `papers/`, `experiments/`, `datasets/`, `methods/` |

6. **For each custom category, what type of content goes in it?** (1-2 sentence description — this goes into AGENTS.md so the agent knows where to put things)

### Section 3: Scale and Tooling

7. **How big do you expect this to get?** (< 50 pages, 50-200, 200+) — this determines whether QMD search is needed immediately or can wait
8. **Do you already have QMD installed?** (yes/no)
9. **Do you already have SIGMA Guard installed?** (yes/no)
10. **What LLM agent will you use?** (Claude, GPT, Gemini, local model, etc.) — this is informational only; the system is agent-agnostic

### Section 4: Privacy and Sensitivity

11. **Is any content sensitive?** (PII, confidential client data, case files, medical info, etc.)
12. **Do you need the wiki to stay entirely local/on-device?** (affects QMD config and whether cloud-based reranking is acceptable)
13. **Should SIGMA Guard run with free-tier limits?** (10K vertices / 100K edges) — relevant if they plan to use it heavily

## Evaluating Custom Categories

After the interview, evaluate the user's proposed custom categories. Apply these checks:

### Merge Check
If two categories overlap significantly, suggest merging them. Example: `subjects/` and `people/` in a PI wiki might overlap — suggest keeping `people/` for known individuals and `subjects/` for investigation targets, or merge into `people/` with a `type: subject` frontmatter field.

### Granularity Check
If a category is too broad (e.g., `stuff/` or `notes/`), suggest splitting it into more specific categories that help the agent route content correctly. The agent uses category names to decide WHERE to write new content — vague names lead to misfiling.

### Necessity Check
If a category would have fewer than ~5 entries over the wiki's lifetime, suggest folding it into an existing category with a type field instead. Example: if you only track 2-3 medications, put them in `concepts/` with `type: medication` rather than creating a `medications/` directory.

### Naming Convention
All directory names should be lowercase, hyphenated, plural nouns: `case-files/` not `Case Files` or `case_file/`. This keeps path references consistent.

Present your evaluation to the user before generating anything. Explain your reasoning and let them accept, reject, or modify your suggestions.

## Generating the Wiki Scaffold

Once the user confirms the categories, generate the complete wiki scaffold. Write all files to the user's specified directory (default: `./my-wiki/` or whatever project name they chose).

### Directory Structure

Create the directory tree based on the confirmed categories. The structure always includes:

```
<project-name>/
├── AGENTS.md              # Generated from template (see below)
├── index.md               # Placeholder (generated by QMD later)
├── pages/                 # Standard
├── concepts/              # Standard
├── sources/               # Standard (always present)
├── meta/                  # Standard (SIGMA lint reports)
├── _config/
│   ├── config.md          # QMD + SIGMA config notes
│   └── mcp.json           # MCP server manifest
└── [custom categories]/   # From interview
```

### AGENTS.md Generation

Read the template from `references/agents-template.md` and customize it with:
- Project name
- Confirmed category list with descriptions
- Categories marked as read-only (always include `sources/`)
- Any privacy/sensitivity rules from the interview
- SIGMA Guard policy (always audit-only)

### MCP Configuration

Generate `_config/mcp.json` based on what the user has installed:
- Always include the QMD server config
- Include SIGMA Guard if installed
- Set `QMD_DATA_DIR` to the wiki root
- Set `SIGMA_FREE_TIER` based on the interview answer

### Git Initialization

After creating all files:
1. Run `git init`
2. Run `git add .`
3. Run `git commit -m "init <project-name> wiki"`

## Post-Setup Guidance

After the scaffold is generated, tell the user:

1. **Immediate next step**: Drop a file in `sources/` and tell the agent to ingest it
2. **QMD activation**: Even with < 50 pages, use `qmd.index` after every page write to build the habit
3. **Regenerating index.md**: `qmd list --format=markdown > index.md` whenever they want a fresh index
4. **When to add QMD search**: At ~50 pages, switch discovery from reading files to `qmd hsearch`
5. **When to use SIGMA Guard**: Only when they explicitly need to verify consistency — weekly lint or targeted audit

Point them to the companion reference document at `references/quick-reference.md` for the full cheat sheet.
