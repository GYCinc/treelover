package main

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

var (
	// Palette — warm amber/gold on deep black
	cAmber      = lipgloss.Color("#ffb347")
	cAmberBright = lipgloss.Color("#ffd700")
	cAmberDim   = lipgloss.Color("#b8860b")
	cGreen      = lipgloss.Color("#3aff3a")
	cGreenDim   = lipgloss.Color("#2e8b57")
	cRed        = lipgloss.Color("#ff6b6b")
	cRedDim     = lipgloss.Color("#8b0000")
	cCyan       = lipgloss.Color("#00d4aa")
	cWhite      = lipgloss.Color("#f0f0f0")
	cGray       = lipgloss.Color("#666666")
	cGrayDim    = lipgloss.Color("#333333")
	cBlack      = lipgloss.Color("#0c0f0c")
	cSurface    = lipgloss.Color("#141814")
	cSurfaceHi  = lipgloss.Color("#1a201a")
)

var (
	appStyle = lipgloss.NewStyle().
		Background(cBlack).
		Foreground(cWhite)

	headerStyle = lipgloss.NewStyle().
		Background(cSurface).
		Foreground(cAmber).
		Bold(true).
		Padding(0, 1).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cAmberDim).
		BorderBottom(true).
		BorderLeft(false).
		BorderRight(false).
		BorderTop(false)

	titleStyle = lipgloss.NewStyle().
		Foreground(cAmberBright).
		Bold(true).
		Italic(true)

	subtitleStyle = lipgloss.NewStyle().
		Foreground(cGray).
		Italic(true)

	boxStyle = lipgloss.NewStyle().
		Background(cBlack).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cGrayDim).
		Padding(0, 1)

	boxActiveStyle = lipgloss.NewStyle().
		Background(cBlack).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cAmber).
		Padding(0, 1)

	treeBoxStyle = lipgloss.NewStyle().
		Background(cBlack).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cAmberDim).
		Padding(0, 1)

	previewBoxStyle = lipgloss.NewStyle().
		Background(cBlack).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cGreenDim).
		Padding(0, 1)

	statusBarStyle = lipgloss.NewStyle().
		Background(cSurface).
		Foreground(cGray).
		Padding(0, 1).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cGrayDim).
		BorderTop(true).
		BorderLeft(false).
		BorderRight(false).
		BorderBottom(false)

	statusKeyStyle = lipgloss.NewStyle().
		Foreground(cAmber).
		Bold(true)

	statusValueStyle = lipgloss.NewStyle().
		Foreground(cWhite)

	selectedStyle = lipgloss.NewStyle().
		Background(cAmberDim).
		Foreground(cBlack).
		Bold(true)

	selectedDimStyle = lipgloss.NewStyle().
		Background(lipgloss.Color("#4a4000")).
		Foreground(cWhite)

	folderStyle = lipgloss.NewStyle().
		Foreground(cAmber)

	fileStyle = lipgloss.NewStyle().
		Foreground(cGreenDim)

	folderIconStyle = lipgloss.NewStyle().
		Foreground(cAmberBright).
		Bold(true)

	fileIconStyle = lipgloss.NewStyle().
		Foreground(cGreen).
		Bold(true)

	cursorStyle = lipgloss.NewStyle().
		Foreground(cAmberBright).
		Bold(true).
		Blink(true)

	modalStyle = lipgloss.NewStyle().
		Background(cSurface).
		Border(lipgloss.DoubleBorder()).
		BorderForeground(cAmber).
		Padding(1, 2).
		Width(50)

	modalTitleStyle = lipgloss.NewStyle().
		Foreground(cAmberBright).
		Bold(true).
		Underline(true).
		MarginBottom(1)

	modalTextStyle = lipgloss.NewStyle().
		Foreground(cWhite)

	inputStyle = lipgloss.NewStyle().
		Background(cBlack).
		Foreground(cWhite).
		Border(lipgloss.NormalBorder()).
		BorderForeground(cAmberDim).
		Padding(0, 1).
		Width(40)

	inputActiveStyle = lipgloss.NewStyle().
		Background(cBlack).
		Foreground(cWhite).
		Border(lipgloss.NormalBorder()).
		BorderForeground(cAmberBright).
		Padding(0, 1).
		Width(40)

	buttonStyle = lipgloss.NewStyle().
		Background(cGrayDim).
		Foreground(cWhite).
		Padding(0, 2).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cGray)

	buttonActiveStyle = lipgloss.NewStyle().
		Background(cAmberDim).
		Foreground(cBlack).
		Bold(true).
		Padding(0, 2).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cAmberBright)

	helpStyle = lipgloss.NewStyle().
		Background(cSurface).
		Foreground(cGray).
		Padding(1, 2).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cGrayDim)

	helpKeyStyle = lipgloss.NewStyle().
		Foreground(cAmber).
		Bold(true)

	helpDescStyle = lipgloss.NewStyle().
		Foreground(cWhite)

	templateCardStyle = lipgloss.NewStyle().
		Background(cBlack).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cGrayDim).
		Padding(0, 1).
		Width(22).
		Height(3)

	templateCardActiveStyle = lipgloss.NewStyle().
		Background(cSurfaceHi).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cAmber).
		Padding(0, 1).
		Width(22).
		Height(3)

	templateNameStyle = lipgloss.NewStyle().
		Foreground(cAmber).
		Bold(true)

	templateDescStyle = lipgloss.NewStyle().
		Foreground(cGray).
		Italic(true)

	toastStyle = lipgloss.NewStyle().
		Background(cGreenDim).
		Foreground(cBlack).
		Bold(true).
		Padding(0, 2).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cGreen)

	toastErrorStyle = lipgloss.NewStyle().
		Background(cRedDim).
		Foreground(cWhite).
		Bold(true).
		Padding(0, 2).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(cRed)

	progressBarEmpty = lipgloss.NewStyle().
		Background(cGrayDim).
		Foreground(cGrayDim)

	progressBarFull = lipgloss.NewStyle().
		Background(cAmber).
		Foreground(cAmberBright)

	spinnerFrames = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}

	splashTitleStyle = lipgloss.NewStyle().
		Foreground(cAmberBright).
		Bold(true).
		Italic(true)

	splashSubtitleStyle = lipgloss.NewStyle().
		Foreground(cGray).
		Italic(true)

	confirmYesStyle = lipgloss.NewStyle().
		Foreground(cGreen).
		Bold(true)

	confirmNoStyle = lipgloss.NewStyle().
		Foreground(cRed).
		Bold(true)
)

func progressBar(width int, percent float64) string {
	filled := int(float64(width) * percent)
	if filled > width {
		filled = width
	}
	if filled < 0 {
		filled = 0
	}
	empty := width - filled
	return progressBarFull.Render(strings.Repeat("█", filled)) + progressBarEmpty.Render(strings.Repeat("░", empty))
}

func spinnerFrame(tick int) string {
	return spinnerFrames[tick%len(spinnerFrames)]
}
