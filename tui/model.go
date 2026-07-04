package main

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// ─── Mode ─────────────────────────────────────────────────────────────

type Mode int

const (
	ModeSplash Mode = iota
	ModeNormal
	ModeRename
	ModeAdd
	ModeImport
	ModeExport
	ModeTemplates
	ModeHelp
	ModeConfirm
	ModeMove
	ModeScan
)

// ─── Messages ─────────────────────────────────────────────────────────

type tickMsg time.Time
type splashDoneMsg struct{}
type toastClearMsg struct{}
type marqueeTickMsg struct{}

// ─── History ──────────────────────────────────────────────────────────

type HistoryEntry struct {
	Tree Tree
}

type History struct {
	Entries []HistoryEntry
	Index   int
}

func (h *History) Push(t Tree) {
	if h.Index < len(h.Entries)-1 {
		h.Entries = h.Entries[:h.Index+1]
	}
	h.Entries = append(h.Entries, HistoryEntry{Tree: t.clone()})
	if len(h.Entries) > 50 {
		h.Entries = h.Entries[1:]
	}
	h.Index = len(h.Entries) - 1
}

func (h *History) Undo() *Tree {
	if h.Index <= 0 {
		return nil
	}
	h.Index--
	t := h.Entries[h.Index].Tree.clone()
	return &t
}

func (h *History) Redo() *Tree {
	if h.Index >= len(h.Entries)-1 {
		return nil
	}
	h.Index++
	t := h.Entries[h.Index].Tree.clone()
	return &t
}

func (h *History) CanUndo() bool { return h.Index > 0 }
func (h *History) CanRedo() bool { return h.Index < len(h.Entries)-1 }

// ─── Model ────────────────────────────────────────────────────────────

type model struct {
	mode       Mode
	width      int
	height     int

	// Splash
	splashTick     int
	splashText     string
	splashTarget   string
	splashStage    int // 0=typing, 1=progress, 2=done
	splashProgress float64

	// Tree
	tree      Tree
	flat      []FlatNode
	cursor    int
	scrollTop int

	// History
	history History

	// Rename
	renameInput  string
	renameCursor int
	renameIsRoot bool

	// Add
	addType   NodeType
	addInput  string
	addCursor int

	// Import
	importInput  string
	importCursor int

	// Export
	exportFormat int // 0=tree, 1=mkdir, 2=json

	// Templates
	templateIdx int

	// Move
	moveSourceID string
	moveCursor   int

	// Confirm
	confirmMsg    string
	confirmAction func()
	confirmYes    bool
	prevMode      Mode

	// Scan
	scanInput  string
	scanCursor int

	// Toast
	toastMsg   string
	toastError bool
	toastTicks int

	// Marquee
	marqueeText   string
	marqueeOffset int

	// Misc
	lastExport string
	quitting   bool
}

func initialModel() model {
	return model{
		mode:         ModeSplash,
		splashTarget: "TREE ARCHITECT",
		tree:         Tree{RootName: "my-project"},
		exportFormat: 0,
		confirmYes:   false,
		marqueeText:  "  j/k navigate • enter expand • a add folder • A add file • r rename • d delete • e export • t templates • ? help • q quit  ",
	}
}

// ─── Init ─────────────────────────────────────────────────────────────

func (m model) Init() tea.Cmd {
	return tea.Batch(
		tickCmd(),
		marqueeCmd(),
	)
}

func tickCmd() tea.Cmd {
	return tea.Tick(time.Millisecond*80, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func marqueeCmd() tea.Cmd {
	return tea.Tick(time.Millisecond*150, func(t time.Time) tea.Msg {
		return marqueeTickMsg{}
	})
}

func splashFinishCmd() tea.Cmd {
	return tea.Tick(time.Millisecond*400, func(t time.Time) tea.Msg {
		return splashDoneMsg{}
	})
}

func toastClearCmd() tea.Cmd {
	return tea.Tick(time.Second*2, func(t time.Time) tea.Msg {
		return toastClearMsg{}
	})
}

// ─── Update ───────────────────────────────────────────────────────────

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.refreshFlat()
		return m, nil

	case tea.KeyMsg:
		return m.handleKey(msg)

	case tickMsg:
		return m.handleTick()

	case marqueeTickMsg:
		m.marqueeOffset++
		if m.marqueeOffset >= len(m.marqueeText) {
			m.marqueeOffset = 0
		}
		return m, marqueeCmd()

	case splashDoneMsg:
		m.mode = ModeNormal
		m.history.Push(m.tree)
		m.refreshFlat()
		return m, nil

	case toastClearMsg:
		m.toastMsg = ""
		return m, nil
	}
	return m, nil
}

func (m *model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if msg.String() == "ctrl+c" {
		return *m, tea.Quit
	}

	switch m.mode {
	case ModeSplash:
		if msg.Type == tea.KeyRunes || msg.Type == tea.KeyEnter || msg.Type == tea.KeySpace {
			m.mode = ModeNormal
			m.history.Push(m.tree)
			m.refreshFlat()
		}
		return *m, nil

	case ModeNormal:
		return m.handleNormalKey(msg)
	case ModeRename:
		return m.handleRenameKey(msg)
	case ModeAdd:
		return m.handleAddKey(msg)
	case ModeImport:
		return m.handleImportKey(msg)
	case ModeExport:
		return m.handleExportKey(msg)
	case ModeTemplates:
		return m.handleTemplatesKey(msg)
	case ModeHelp:
		return m.handleHelpKey(msg)
	case ModeConfirm:
		return m.handleConfirmKey(msg)
	case ModeMove:
		return m.handleMoveKey(msg)
	case ModeScan:
		return m.handleScanKey(msg)
	}
	return *m, nil
}

func (m *model) handleNormalKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "esc":
		if m.moveSourceID != "" {
			m.moveSourceID = ""
			m.refreshFlat()
			return *m, nil
		}
		m.showConfirm("Quit tree_Lover?", func() {
			m.quitting = true
		})
		return *m, nil

	case "j", "down":
		m.cursorDown()
	case "k", "up":
		m.cursorUp()
	case "h", "left":
		m.collapseCurrent()
	case "l", "right", "enter":
		m.expandCurrent()

	case "g":
		m.cursor = 0
		m.scrollTop = 0
	case "G":
		m.cursor = len(m.flat) - 1
		if m.cursor < 0 {
			m.cursor = 0
		}

	case "a":
		m.addType = FolderNode
		m.addInput = ""
		m.addCursor = 0
		m.mode = ModeAdd
	case "A":
		m.addType = FileNode
		m.addInput = ""
		m.addCursor = 0
		m.mode = ModeAdd

	case "r":
		if len(m.flat) > 0 {
			m.renameInput = m.flat[m.cursor].Node.Name
			m.renameCursor = len(m.renameInput)
			m.renameIsRoot = false
			m.mode = ModeRename
		}
	case "R":
		m.renameInput = m.tree.RootName
		m.renameCursor = len(m.renameInput)
		m.renameIsRoot = true
		m.mode = ModeRename

	case "d":
		if len(m.flat) > 0 {
			node := m.flat[m.cursor].Node
			m.showConfirm(fmt.Sprintf("Delete '%s'?", node.Name), func() {
				m.history.Push(m.tree)
				m.tree.deleteNode(node.ID)
				m.refreshFlat()
				if m.cursor >= len(m.flat) {
					m.cursor = len(m.flat) - 1
					if m.cursor < 0 {
						m.cursor = 0
					}
				}
			})
		}
	case "y":
		if m.lastExport != "" {
			if err := copyToClipboard(m.lastExport); err == nil {
				m.showToast("Copied to clipboard!", false)
			} else {
				m.showToast("Failed to copy", true)
			}
		} else {
			m.showToast("Nothing to copy — press 'e' to export", true)
		}
	case "Y":
		m.exportToFile()

	case "e":
		m.mode = ModeExport
	case "i":
		m.importInput = ""
		m.importCursor = 0
		m.mode = ModeImport
	case "t":
		m.templateIdx = 0
		m.mode = ModeTemplates
	case "?":
		m.prevMode = m.mode
		m.mode = ModeHelp

	case "u":
		if t := m.history.Undo(); t != nil {
			m.tree = *t
			m.refreshFlat()
			m.showToast("Undo", false)
		}
	case "U":
		if t := m.history.Redo(); t != nil {
			m.tree = *t
			m.refreshFlat()
			m.showToast("Redo", false)
		}

	case "E":
		m.tree.expandAll()
		m.refreshFlat()
		m.showToast("Expanded all", false)
	case "C":
		m.tree.collapseAll()
		m.refreshFlat()
		m.showToast("Collapsed all", false)

	case "m":
		if len(m.flat) > 0 {
			m.moveSourceID = m.flat[m.cursor].Node.ID
			m.moveCursor = m.cursor
			m.mode = ModeMove
		}
	case "c":
		if len(m.flat) > 0 {
			m.history.Push(m.tree)
			m.tree.duplicate(m.flat[m.cursor].Node.ID)
			m.refreshFlat()
			m.showToast("Duplicated", false)
		}
	case "x":
		if len(m.flat) > 0 {
			m.tree.moveUpDown(m.flat[m.cursor].Node.ID, -1)
			m.refreshFlat()
		}
	case "X":
		if len(m.flat) > 0 {
			m.tree.moveUpDown(m.flat[m.cursor].Node.ID, 1)
			m.refreshFlat()
		}

	case "s":
		m.scanInput = "."
		m.scanCursor = 1
		m.mode = ModeScan
	}
	return *m, nil
}

func (m *model) handleRenameKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		name := strings.TrimSpace(m.renameInput)
		if name != "" {
			m.history.Push(m.tree)
			if m.renameIsRoot {
				m.tree.RootName = name
			} else if len(m.flat) > 0 {
				m.flat[m.cursor].Node.Name = name
			}
		}
		m.mode = ModeNormal
		m.refreshFlat()
	case tea.KeyEsc:
		m.mode = ModeNormal
	case tea.KeyBackspace:
		if m.renameCursor > 0 {
			m.renameInput = m.renameInput[:m.renameCursor-1] + m.renameInput[m.renameCursor:]
			m.renameCursor--
		}
	case tea.KeyLeft:
		if m.renameCursor > 0 {
			m.renameCursor--
		}
	case tea.KeyRight:
		if m.renameCursor < len(m.renameInput) {
			m.renameCursor++
		}
	case tea.KeyRunes:
		m.renameInput = m.renameInput[:m.renameCursor] + string(msg.Runes) + m.renameInput[m.renameCursor:]
		m.renameCursor += len(msg.Runes)
	}
	return *m, nil
}

func (m *model) handleAddKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		name := strings.TrimSpace(m.addInput)
		if name != "" {
			m.history.Push(m.tree)
			var node TreeNode
			if m.addType == FolderNode {
				node = newFolder(name)
			} else {
				node = newFile(name)
			}
			if len(m.flat) > 0 {
				current := m.flat[m.cursor]
				if current.Node.Type == FolderNode {
					m.tree.addChild(current.Node.ID, node)
				} else {
					parent := current.Parent
					if parent != nil && parent != &m.tree.Nodes {
						for i := range m.flat {
							if &m.flat[i].Node.Children == parent {
								m.tree.addChild(m.flat[i].Node.ID, node)
								break
							}
						}
					} else {
						m.tree.Nodes = append(m.tree.Nodes, node)
					}
				}
			} else {
				m.tree.Nodes = append(m.tree.Nodes, node)
			}
			m.refreshFlat()
		}
		m.mode = ModeNormal
	case tea.KeyEsc:
		m.mode = ModeNormal
	case tea.KeyBackspace:
		if m.addCursor > 0 {
			m.addInput = m.addInput[:m.addCursor-1] + m.addInput[m.addCursor:]
			m.addCursor--
		}
	case tea.KeyLeft:
		if m.addCursor > 0 {
			m.addCursor--
		}
	case tea.KeyRight:
		if m.addCursor < len(m.addInput) {
			m.addCursor++
		}
	case tea.KeyRunes:
		m.addInput = m.addInput[:m.addCursor] + string(msg.Runes) + m.addInput[m.addCursor:]
		m.addCursor += len(msg.Runes)
	}
	return *m, nil
}

func (m *model) handleImportKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		if strings.TrimSpace(m.importInput) != "" {
			m.history.Push(m.tree)
			m.tree = parseTreeText(m.importInput)
			m.refreshFlat()
			m.showToast("Imported tree", false)
		}
		m.mode = ModeNormal
	case tea.KeyEsc:
		m.mode = ModeNormal
	case tea.KeyBackspace:
		if m.importCursor > 0 {
			m.importInput = m.importInput[:m.importCursor-1] + m.importInput[m.importCursor:]
			m.importCursor--
		}
	case tea.KeyLeft:
		if m.importCursor > 0 {
			m.importCursor--
		}
	case tea.KeyRight:
		if m.importCursor < len(m.importInput) {
			m.importCursor++
		}
	case tea.KeyRunes:
		m.importInput = m.importInput[:m.importCursor] + string(msg.Runes) + m.importInput[m.importCursor:]
		m.importCursor += len(msg.Runes)
	}
	return *m, nil
}

func (m *model) handleExportKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "j", "down":
		m.exportFormat = (m.exportFormat + 1) % 3
	case "k", "up":
		m.exportFormat = (m.exportFormat + 2) % 3
	case "enter", "y":
		m.lastExport = m.currentExportText()
		if err := copyToClipboard(m.lastExport); err == nil {
			m.showToast("Copied to clipboard!", false)
		} else {
			m.showToast("Failed to copy", true)
		}
		m.mode = ModeNormal
	case "Y":
		m.exportToFile()
		m.mode = ModeNormal
	case "e", "esc", "q":
		m.mode = ModeNormal
	}
	return *m, nil
}

func (m *model) handleTemplatesKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	cols := m.width / 24
	if cols < 1 {
		cols = 1
	}

	switch msg.String() {
	case "j", "down":
		m.templateIdx += cols
		if m.templateIdx >= len(templates) {
			m.templateIdx = len(templates) - 1
		}
	case "k", "up":
		m.templateIdx -= cols
		if m.templateIdx < 0 {
			m.templateIdx = 0
		}
	case "h", "left":
		if m.templateIdx > 0 {
			m.templateIdx--
		}
	case "l", "right":
		if m.templateIdx < len(templates)-1 {
			m.templateIdx++
		}
	case "enter":
		m.history.Push(m.tree)
		t := templates[m.templateIdx]
		m.tree = Tree{RootName: t.RootName}
		for _, n := range t.Nodes {
			m.tree.Nodes = append(m.tree.Nodes, deepCloneNode(n))
		}
		m.refreshFlat()
		m.showToast(fmt.Sprintf("Loaded: %s", t.Name), false)
		m.mode = ModeNormal
	case "t", "esc", "q":
		m.mode = ModeNormal
	}
	return *m, nil
}

func (m *model) handleHelpKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if msg.Type == tea.KeyEsc || msg.String() == "q" || msg.String() == "?" {
		m.mode = m.prevMode
	}
	return *m, nil
}

func (m *model) handleConfirmKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "Y":
		m.confirmYes = true
		m.mode = m.prevMode
		if m.confirmAction != nil {
			m.confirmAction()
		}
		if m.quitting {
			return *m, tea.Quit
		}
	case "n", "N", "esc":
		m.confirmYes = false
		m.mode = m.prevMode
	case "left":
		m.confirmYes = true
	case "right":
		m.confirmYes = false
	case "enter":
		m.mode = m.prevMode
		if m.confirmYes && m.confirmAction != nil {
			m.confirmAction()
		}
		if m.quitting {
			return *m, tea.Quit
		}
	}
	return *m, nil
}

func (m *model) handleMoveKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "j", "down":
		m.moveCursor++
		if m.moveCursor >= len(m.flat) {
			m.moveCursor = len(m.flat) - 1
		}
		if m.moveCursor < 0 {
			m.moveCursor = 0
		}
	case "k", "up":
		m.moveCursor--
		if m.moveCursor < 0 {
			m.moveCursor = 0
		}
	case "enter":
		if len(m.flat) > 0 {
			target := m.flat[m.moveCursor].Node
			if target.Type == FolderNode && target.ID != m.moveSourceID {
				m.history.Push(m.tree)
				m.tree.moveNode(m.moveSourceID, target.ID)
				m.moveSourceID = ""
				m.mode = ModeNormal
				m.refreshFlat()
				m.showToast("Moved", false)
			}
		}
	case "r":
		m.history.Push(m.tree)
		m.tree.moveNode(m.moveSourceID, "")
		m.moveSourceID = ""
		m.mode = ModeNormal
		m.refreshFlat()
		m.showToast("Moved to root", false)
	case "esc", "q", "m":
		m.moveSourceID = ""
		m.mode = ModeNormal
	}
	return *m, nil
}

func (m *model) handleScanKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		path := strings.TrimSpace(m.scanInput)
		if path == "" {
			path = "."
		}
		if t, err := scanDir(path); err == nil {
			m.history.Push(m.tree)
			m.tree = t
			m.refreshFlat()
			m.showToast(fmt.Sprintf("Scanned: %s", t.RootName), false)
		} else {
			m.showToast(fmt.Sprintf("Error: %v", err), true)
		}
		m.mode = ModeNormal
	case tea.KeyEsc:
		m.mode = ModeNormal
	case tea.KeyBackspace:
		if m.scanCursor > 0 {
			m.scanInput = m.scanInput[:m.scanCursor-1] + m.scanInput[m.scanCursor:]
			m.scanCursor--
		}
	case tea.KeyLeft:
		if m.scanCursor > 0 {
			m.scanCursor--
		}
	case tea.KeyRight:
		if m.scanCursor < len(m.scanInput) {
			m.scanCursor++
		}
	case tea.KeyRunes:
		m.scanInput = m.scanInput[:m.scanCursor] + string(msg.Runes) + m.scanInput[m.scanCursor:]
		m.scanCursor += len(msg.Runes)
	}
	return *m, nil
}

func (m *model) handleTick() (tea.Model, tea.Cmd) {
	m.splashTick++

	if m.mode == ModeSplash {
		switch m.splashStage {
		case 0:
			if m.splashTick%2 == 0 && len(m.splashText) < len(m.splashTarget) {
				m.splashText = m.splashTarget[:len(m.splashText)+1]
			}
			if len(m.splashText) >= len(m.splashTarget) {
				m.splashStage = 1
				m.splashTick = 0
			}
		case 1:
			m.splashProgress += 0.04
			if m.splashProgress >= 1.0 {
				m.splashProgress = 1.0
				m.splashStage = 2
				return *m, splashFinishCmd()
			}
		}
	}

	if m.toastTicks > 0 {
		m.toastTicks--
	}

	return *m, tickCmd()
}

// ─── Helpers ──────────────────────────────────────────────────────────

func (m *model) refreshFlat() {
	m.flat = m.tree.flatten()
	if m.cursor >= len(m.flat) {
		m.cursor = len(m.flat) - 1
		if m.cursor < 0 {
			m.cursor = 0
		}
	}
}

func (m *model) cursorDown() {
	if m.cursor < len(m.flat)-1 {
		m.cursor++
	}
}

func (m *model) cursorUp() {
	if m.cursor > 0 {
		m.cursor--
	}
}

func (m *model) expandCurrent() {
	if len(m.flat) == 0 {
		return
	}
	node := m.flat[m.cursor].Node
	if node.Type == FolderNode {
		node.IsExpanded = !node.IsExpanded
		m.refreshFlat()
	}
}

func (m *model) collapseCurrent() {
	if len(m.flat) == 0 {
		return
	}
	node := m.flat[m.cursor].Node
	if node.Type == FolderNode && node.IsExpanded {
		node.IsExpanded = false
		m.refreshFlat()
	} else if m.flat[m.cursor].Depth > 0 {
		for i := m.cursor - 1; i >= 0; i-- {
			if m.flat[i].Depth < m.flat[m.cursor].Depth {
				m.cursor = i
				break
			}
		}
	}
}

func (m *model) currentExportText() string {
	switch m.exportFormat {
	case 1:
		return m.tree.toMkdir()
	case 2:
		return m.tree.toJSON()
	default:
		return m.tree.toTreeText()
	}
}

func (m *model) showToast(msg string, isError bool) {
	m.toastMsg = msg
	m.toastError = isError
	m.toastTicks = 30
}

func (m *model) showConfirm(msg string, action func()) {
	m.confirmMsg = msg
	m.confirmAction = action
	m.confirmYes = false
	m.prevMode = m.mode
	m.mode = ModeConfirm
}

func (m *model) exportToFile() {
	m.lastExport = m.currentExportText()
	ext := "txt"
	if m.exportFormat == 2 {
		ext = "json"
	}
	filename := fmt.Sprintf("%s-structure.%s", m.tree.RootName, ext)
	if err := os.WriteFile(filename, []byte(m.lastExport), 0644); err == nil {
		m.showToast(fmt.Sprintf("Saved to %s", filename), false)
	} else {
		m.showToast(fmt.Sprintf("Save failed: %v", err), true)
	}
}

func copyToClipboard(text string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("pbcopy")
	case "linux":
		if _, err := exec.LookPath("xclip"); err == nil {
			cmd = exec.Command("xclip", "-selection", "clipboard")
		} else if _, err := exec.LookPath("xsel"); err == nil {
			cmd = exec.Command("xsel", "--clipboard", "--input")
		} else if _, err := exec.LookPath("wl-copy"); err == nil {
			cmd = exec.Command("wl-copy")
		} else {
			return fmt.Errorf("no clipboard tool found")
		}
	case "windows":
		cmd = exec.Command("powershell", "-command", "Set-Clipboard", "-Value", text)
		return cmd.Run()
	default:
		return fmt.Errorf("unsupported OS")
	}
	cmd.Stdin = strings.NewReader(text)
	return cmd.Run()
}

// ─── View ─────────────────────────────────────────────────────────────

func (m model) View() string {
	switch m.mode {
	case ModeSplash:
		return m.viewSplash()
	case ModeHelp:
		return m.viewHelp()
	case ModeTemplates:
		return m.viewTemplates()
	case ModeConfirm:
		return m.viewConfirm()
	default:
		return m.viewMain()
	}
}

func (m model) viewSplash() string {
	if m.width == 0 || m.height == 0 {
		return "Loading..."
	}

	spinner := spinnerFrame(m.splashTick)
	title := splashTitleStyle.Render(m.splashText)
	subtitle := splashSubtitleStyle.Render("Visual folder structure builder")
	version := lipgloss.NewStyle().Foreground(cGray).Render("v2.0 • TUI Edition")

	var progress string
	if m.splashStage >= 1 {
		barWidth := 40
		if m.width-20 < barWidth {
			barWidth = m.width - 20
			if barWidth < 10 {
				barWidth = 10
			}
		}
		progress = progressBar(barWidth, m.splashProgress)
	}

	var status string
	if m.splashStage == 0 {
		status = lipgloss.NewStyle().Foreground(cAmberDim).Render(spinner + " Booting...")
	} else if m.splashStage == 1 {
		status = lipgloss.NewStyle().Foreground(cAmber).Render(spinner + " Loading modules...")
	} else {
		status = lipgloss.NewStyle().Foreground(cGreen).Render("Ready")
	}

	content := lipgloss.JoinVertical(lipgloss.Center,
		"",
		"",
		title,
		"",
		subtitle,
		"",
		version,
		"",
		progress,
		"",
		status,
		"",
		lipgloss.NewStyle().Foreground(cGrayDim).Render("Press any key to skip"),
	)

	return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center,
		boxStyle.Render(content))
}

func (m model) viewMain() string {
	if m.width == 0 || m.height == 0 {
		return ""
	}

	header := m.renderHeader()
	statusBar := m.renderStatusBar()

	contentHeight := m.height - lipgloss.Height(header) - lipgloss.Height(statusBar) - 2
	if contentHeight < 5 {
		contentHeight = 5
	}

	leftWidth := m.width * 45 / 100
	rightWidth := m.width - leftWidth - 4
	if leftWidth < 20 {
		leftWidth = 20
	}
	if rightWidth < 20 {
		rightWidth = 20
	}

	left := m.renderTree(leftWidth, contentHeight)
	right := m.renderPreview(rightWidth, contentHeight)

	content := lipgloss.JoinHorizontal(lipgloss.Top, left, "  ", right)

	// Modal overlays — return centered modal for these modes
	switch m.mode {
	case ModeRename:
		return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, m.renderRenameModal())
	case ModeAdd:
		return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, m.renderAddModal())
	case ModeImport:
		return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, m.renderImportModal())
	case ModeExport:
		return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, m.renderExportModal())
	case ModeMove:
		return m.renderMoveView(header, content, statusBar, contentHeight)
	case ModeScan:
		return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, m.renderScanModal())
	}

	return lipgloss.JoinVertical(lipgloss.Left, header, content, statusBar)
}

func (m model) renderHeader() string {
	title := titleStyle.Render("TREE ARCHITECT")
	sub := subtitleStyle.Render("  folder structure builder")
	return headerStyle.Render(lipgloss.JoinHorizontal(lipgloss.Center, title, sub))
}

func (m model) renderStatusBar() string {
	if m.toastMsg != "" {
		var toast string
		if m.toastError {
			toast = toastErrorStyle.Render(" " + m.toastMsg + " ")
		} else {
			toast = toastStyle.Render(" " + m.toastMsg + " ")
		}
		return statusBarStyle.Width(m.width - 2).Render(
			lipgloss.PlaceHorizontal(m.width-2, lipgloss.Right, toast),
		)
	}

	folders, files, maxDepth, total := m.tree.stats()

	left := lipgloss.JoinHorizontal(lipgloss.Left,
		statusKeyStyle.Render(" F "), statusValueStyle.Render(fmt.Sprintf("%d ", folders)),
		statusKeyStyle.Render(" f "), statusValueStyle.Render(fmt.Sprintf("%d ", files)),
		statusKeyStyle.Render(" D "), statusValueStyle.Render(fmt.Sprintf("%d ", maxDepth)),
		statusKeyStyle.Render(" T "), statusValueStyle.Render(fmt.Sprintf("%d", total)),
	)

	marquee := m.getMarquee()
	spacerWidth := m.width - lipgloss.Width(left) - lipgloss.Width(marquee) - 4
	if spacerWidth < 0 {
		spacerWidth = 0
	}

	return statusBarStyle.Render(lipgloss.JoinHorizontal(lipgloss.Center,
		left,
		lipgloss.NewStyle().Width(spacerWidth).Render(""),
		marquee,
	))
}

func (m model) getMarquee() string {
	if len(m.marqueeText) == 0 {
		return ""
	}
	text := m.marqueeText + m.marqueeText
	start := m.marqueeOffset % len(m.marqueeText)
	visible := 40
	if m.width/3 < visible {
		visible = m.width / 3
	}
	if visible < 10 {
		visible = 10
	}
	end := start + visible
	if end > len(text) {
		end = len(text)
	}
	return lipgloss.NewStyle().Foreground(cGray).Italic(true).Render(text[start:end])
}

func (m model) renderTree(width, height int) string {
	var lines []string
	rootLine := folderIconStyle.Render("  ") + folderStyle.Render(m.tree.RootName+"/")
	lines = append(lines, rootLine)

	visibleEnd := m.scrollTop + height - 3
	if visibleEnd > len(m.flat) {
		visibleEnd = len(m.flat)
	}

	for i := m.scrollTop; i < visibleEnd && i < len(m.flat); i++ {
		lines = append(lines, m.renderTreeNode(m.flat[i], i == m.cursor))
	}

	for len(lines) < height-1 {
		lines = append(lines, "")
	}

	title := lipgloss.NewStyle().Foreground(cAmberDim).Bold(true).Render("BUILDER")
	treeContent := lipgloss.JoinVertical(lipgloss.Left, append([]string{title, ""}, lines...)...)

	return treeBoxStyle.Width(width).Height(height).Render(treeContent)
}

func (m model) renderTreeNode(fn FlatNode, isSelected bool) string {
	indent := strings.Repeat("  ", fn.Depth)
	var icon string
	var nameStyle lipgloss.Style

	if fn.Node.Type == FolderNode {
		if fn.Node.IsExpanded {
			icon = folderIconStyle.Render("▾ ")
		} else {
			icon = folderIconStyle.Render("▸ ")
		}
		nameStyle = folderStyle
	} else {
		icon = fileIconStyle.Render("• ")
		nameStyle = fileStyle
	}

	name := nameStyle.Render(fn.Node.Name)
	if fn.Node.Type == FolderNode {
		name += lipgloss.NewStyle().Foreground(cAmberDim).Render("/")
	}

	line := indent + icon + name

	if isSelected {
		return selectedStyle.Render(" " + line + " ")
	}
	return " " + line + " "
}

func (m model) renderPreview(width, height int) string {
	formats := []string{"TREE", "MKDIR", "JSON"}
	formatLabel := lipgloss.NewStyle().Foreground(cGreen).Bold(true).Render(formats[m.exportFormat])
	title := lipgloss.JoinHorizontal(lipgloss.Left,
		lipgloss.NewStyle().Foreground(cGreenDim).Bold(true).Render("EXPORT "),
		formatLabel,
	)

	text := m.currentExportText()
	lines := strings.Split(text, "\n")

	visibleLines := height - 3
	if visibleLines < 3 {
		visibleLines = 3
	}
	var displayed []string
	for i := 0; i < len(lines) && i < visibleLines; i++ {
		line := lines[i]
		if lipgloss.Width(line) > width-4 {
			line = line[:width-7] + "..."
		}
		displayed = append(displayed, lipgloss.NewStyle().Foreground(cWhite).Render(line))
	}
	for len(displayed) < visibleLines {
		displayed = append(displayed, "")
	}

	content := lipgloss.JoinVertical(lipgloss.Left, append([]string{title, ""}, displayed...)...)
	return previewBoxStyle.Width(width).Height(height).Render(content)
}

func (m model) renderRenameModal() string {
	title := modalTitleStyle.Render("RENAME")
	label := modalTextStyle.Render("Name:")
	input := m.renderInputField(m.renameInput, m.renameCursor)
	hint := lipgloss.NewStyle().Foreground(cGray).Render("Enter to confirm  Esc to cancel")
	content := lipgloss.JoinVertical(lipgloss.Left, title, "", label, input, "", hint)
	return modalStyle.Render(content)
}

func (m model) renderAddModal() string {
	typeLabel := "FOLDER"
	if m.addType == FileNode {
		typeLabel = "FILE"
	}
	title := modalTitleStyle.Render("ADD " + typeLabel)
	label := modalTextStyle.Render("Name:")
	input := m.renderInputField(m.addInput, m.addCursor)
	hint := lipgloss.NewStyle().Foreground(cGray).Render("Enter to confirm  Esc to cancel")
	content := lipgloss.JoinVertical(lipgloss.Left, title, "", label, input, "", hint)
	return modalStyle.Render(content)
}

func (m model) renderImportModal() string {
	title := modalTitleStyle.Render("IMPORT TREE")
	label := modalTextStyle.Render("Paste tree structure:")

	lines := strings.Split(m.importInput, "\n")
	var displayed []string
	for i := 0; i < len(lines) && i < 6; i++ {
		line := lines[i]
		if len(line) > 45 {
			line = line[:42] + "..."
		}
		displayed = append(displayed, inputStyle.Render(line))
	}
	if len(displayed) == 0 {
		displayed = append(displayed, inputStyle.Render(""))
	}

	cursor := "_"
	if m.splashTick%8 < 4 {
		cursor = " "
	}

	hint := lipgloss.NewStyle().Foreground(cGray).Render("Enter to import  Esc to cancel")
	content := lipgloss.JoinVertical(lipgloss.Left,
		title, "", label,
		lipgloss.JoinVertical(lipgloss.Left, displayed...),
		cursor,
		"", hint,
	)
	return modalStyle.Render(content)
}

func (m model) renderScanModal() string {
	title := modalTitleStyle.Render("SCAN DIRECTORY")
	label := modalTextStyle.Render("Path to scan:")
	input := m.renderInputField(m.scanInput, m.scanCursor)
	hint := lipgloss.NewStyle().Foreground(cGray).Render("Enter to scan  Esc to cancel")
	content := lipgloss.JoinVertical(lipgloss.Left, title, "", label, input, "", hint)
	return modalStyle.Render(content)
}

func (m model) renderExportModal() string {
	title := modalTitleStyle.Render("EXPORT")
	formats := []string{"ASCII Tree", "mkdir Commands", "JSON Structure"}

	var lines []string
	for i, f := range formats {
		marker := "  "
		style := lipgloss.NewStyle().Foreground(cWhite)
		if i == m.exportFormat {
			marker = "  "
			style = lipgloss.NewStyle().Foreground(cAmberBright).Bold(true)
		}
		lines = append(lines, style.Render(marker+f))
	}

	hint := lipgloss.NewStyle().Foreground(cGray).Render("j/k to change  Enter/y to copy  Y to save  Esc to close")
	content := lipgloss.JoinVertical(lipgloss.Left,
		title, "",
		lipgloss.JoinVertical(lipgloss.Left, lines...),
		"", hint,
	)
	return modalStyle.Render(content)
}

func (m model) renderMoveView(header, content, statusBar string, contentHeight int) string {
	nodeName := ""
	for _, fn := range m.flat {
		if fn.Node.ID == m.moveSourceID {
			nodeName = fn.Node.Name
			break
		}
	}
	msg := fmt.Sprintf("MOVING: %s  j/k=select target  Enter=drop  r=root  Esc=cancel", nodeName)
	banner := lipgloss.NewStyle().
		Background(lipgloss.Color("#4a4000")).
		Foreground(cAmberBright).
		Bold(true).
		Padding(0, 2).
		Width(m.width - 4).
		Render(msg)

	return lipgloss.JoinVertical(lipgloss.Left, header, banner, content, statusBar)
}

func (m model) renderInputField(value string, cursorPos int) string {
	before := value[:cursorPos]
	after := ""
	if cursorPos < len(value) {
		after = value[cursorPos:]
	}
	cursor := " "
	if m.splashTick%8 < 4 {
		cursor = "_"
	}
	return inputActiveStyle.Render(before + cursor + after)
}

func (m model) viewHelp() string {
	keys := [][]string{
		{"j/k or /", "Navigate tree"},
		{"h/l or /", "Collapse/expand"},
		{"Enter", "Toggle folder"},
		{"g / G", "Go to top / bottom"},
		{"a / A", "Add folder / file"},
		{"r", "Rename node"},
		{"R", "Rename root"},
		{"d", "Delete node"},
		{"c", "Duplicate node"},
		{"x / X", "Move up / down"},
		{"m", "Move mode"},
		{"E / C", "Expand / collapse all"},
		{"e", "Export panel"},
		{"y", "Copy to clipboard"},
		{"Y", "Save to file"},
		{"i", "Import from text"},
		{"s", "Scan directory"},
		{"t", "Load template"},
		{"u / U", "Undo / redo"},
		{"?", "This help"},
		{"q / Esc", "Quit / cancel"},
	}

	var lines []string
	for _, k := range keys {
		keyStr := helpKeyStyle.Render(fmt.Sprintf(" %-12s ", k[0]))
		descStr := helpDescStyle.Render(k[1])
		lines = append(lines, lipgloss.JoinHorizontal(lipgloss.Left, keyStr, "  ", descStr))
	}

	title := modalTitleStyle.Render("KEYBOARD SHORTCUTS")
	content := lipgloss.JoinVertical(lipgloss.Left,
		title, "",
		lipgloss.JoinVertical(lipgloss.Left, lines...),
		"",
		lipgloss.NewStyle().Foreground(cGray).Render("Press Esc or ? to close"),
	)

	return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, modalStyle.Render(content))
}

func (m model) viewTemplates() string {
	var lines []string
	cols := m.width / 24
	if cols < 1 {
		cols = 1
	}

	for i := 0; i < len(templates); i += cols {
		var row []string
		for j := 0; j < cols && i+j < len(templates); j++ {
			idx := i + j
			t := templates[idx]
			style := templateCardStyle
			if idx == m.templateIdx {
				style = templateCardActiveStyle
			}
			name := templateNameStyle.Render(t.Name)
			desc := templateDescStyle.Render(t.Description)
			card := lipgloss.JoinVertical(lipgloss.Left, name, desc)
			row = append(row, style.Render(card))
		}
		lines = append(lines, lipgloss.JoinHorizontal(lipgloss.Top, row...))
	}

	title := modalTitleStyle.Render("PROJECT TEMPLATES")
	hint := lipgloss.NewStyle().Foreground(cGray).Render("j/k/h/l to navigate  Enter to load  Esc to close")
	content := lipgloss.JoinVertical(lipgloss.Left,
		title, "",
		lipgloss.JoinVertical(lipgloss.Left, lines...),
		"", hint,
	)

	return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, modalStyle.Render(content))
}

func (m model) viewConfirm() string {
	title := modalTitleStyle.Render("CONFIRM")
	msg := modalTextStyle.Render(m.confirmMsg)

	var yesStyle, noStyle lipgloss.Style
	if m.confirmYes {
		yesStyle = buttonActiveStyle
		noStyle = buttonStyle
	} else {
		yesStyle = buttonStyle
		noStyle = buttonActiveStyle
	}

	buttons := lipgloss.JoinHorizontal(lipgloss.Center,
		yesStyle.Render(" YES "), "   ", noStyle.Render(" NO "),
	)

	hint := lipgloss.NewStyle().Foreground(cGray).Render("/ to select  Enter to confirm")
	content := lipgloss.JoinVertical(lipgloss.Center,
		title, "", msg, "", buttons, "", hint,
	)
	return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, modalStyle.Render(content))
}

// ─── Main ─────────────────────────────────────────────────────────────

func main() {
	p := tea.NewProgram(initialModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
