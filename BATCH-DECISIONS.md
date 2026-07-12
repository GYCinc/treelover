# Batch Feature Decisions — Clarifications

Reference for all 10 batches. These are the final calls on open questions.

---

## Batch 1 — Share via URL (Tree Permalink)

1. **localStorage overwrite on URL load?** NO. Only save to `localStorage` once the user modifies the shared tree. Don't silently overwrite their saved tree just from opening a link.
2. **Invalid/malformed hash handling?** Silently fall back to the `localStorage` tree. No toast, no error. Invalid links happen (truncation, etc.) — don't alarm the user.

---

## Batch 2 — .gitignore Generator

3. **Universal ignores (`*.log`, `.DS_Store`)?** Include in **every** generated `.gitignore` by default. They're universally safe. All other patterns are conditional on detected framework/files.
4. **Copy or download?** Provide **both** — a "copy to clipboard" button and a "download" button. Match the pattern of existing export buttons.

---

## Batch 3 — Custom User Templates

5. **Duplicate template names?** Allow duplicates. They have unique IDs. Don't overwrite, don't prompt "are you sure?" — just add.

---

## Batch 4 — Search / Filter

6. **Parent matches — children visible?** YES. If a parent folder matches the search, show all its children. But only highlight nodes whose name actually matches — children are visible but unhighlighted.
7. **Highlight style?** Highlight the exact matched **substring** within the node name (e.g., `my<mark>src</mark>folder`), not the entire row background.

---

## Batch 5 — Node Annotations (Descriptions)

8. **Where does the note editor live?** The app has **no existing details panel**. Add an inline `Popover` (shadcn) triggered by a small `StickyNote` icon (lucide-react) next to the node. Popover contains a `Textarea`, saves on close. No new panel infrastructure.

---

## Batch 6 — Multi-Select + Bulk Operations

9. **Move destination UX?** Use a **dropdown folder picker** in the floating action bar, NOT drag-and-drop. DnD with multi-select is a UX rabbit hole. Grey out a folder in the list if it's a descendant of any selected node (can't move into own child).

---

## Batch 8 — Tree Diff View

10. **Move + rename detection?** Treat as **removal (old path) + addition (new path)**. No ID-tracking heuristics. Path-based diff is sufficient for this planning tool.

---

## Batch 9 — Monorepo Workspace Generator

11. **Output format?** Single bash script (`generate-workspace.sh`) using `cat <<'EOF'` to create each config file. No zip, no new dependencies.

---

## Batch 10 — Clean Documentation Export

12. **Markdown output?** Provide **both** "Copy to clipboard" and "Download .md" buttons, same pattern as Batch 2.

---

## Build Order Note

Batches are independent and can be done in any order, EXCEPT:
- **Batch 5 (Annotations) should come before Batch 10** — the markdown export includes a "Notes" section that depends on node notes existing.

## Testing Reminder

No frontend test suite exists. After each batch:
- `bun run dev` → manually test at `localhost:3000`
- `bun run lint` → catches syntax issues
- `bun run build` → verifies production build
- No `DEEPSEEK_API_KEY` needed for any of these features
- Don't touch `tui/` (Go TUI) — none of these require TUI changes
