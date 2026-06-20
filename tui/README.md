# Terminal UI

A Bubble Tea + Lip Gloss version of the tree builder.

## Run

```bash
cd tui
go run .
```

Or build first:

```bash
cd tui
go build -o tree-architect .
./tree-architect
```

## Test

```bash
cd tui
go test ./...
```

## Controls

| Key | Action |
|-----|--------|
| j/k or / | Navigate tree |
| h/l or / | Collapse / expand folder |
| Enter | Toggle folder |
| g / G | Jump to top / bottom |
| a / A | Add folder / file |
| r | Rename selected node |
| R | Rename root |
| d | Delete node |
| c | Duplicate node |
| x / X | Move node up / down |
| m | Move mode (pick target, Enter to drop, r for root) |
| E / C | Expand all / Collapse all |
| e | Export panel (tree / mkdir / JSON) |
| y | Copy export to clipboard |
| Y | Save export to file |
| i | Import from ASCII tree text |
| s | Scan directory |
| t | Load project template |
| u / U | Undo / Redo |
| ? | Help |
| q / Esc | Quit / Cancel |

## Features

- **Splash screen** — animated typewriter + progress bar
- **Tree navigation** — keyboard-driven with expand/collapse
- **Undo/Redo** — full history stack (50 entries)
- **Export** — ASCII tree, mkdir commands, JSON
- **Import** — paste existing tree structures
- **Templates** — Next.js, Python, React Library, Go, Generic, LLM Wiki, Weekly Calendar
- **Directory scan** — import real folders
- **Move mode** — relocate nodes with visual feedback
- **Clipboard** — copy any export format
- **Toasts** — animated success/error notifications
- **Scrolling marquee** — status bar hints
