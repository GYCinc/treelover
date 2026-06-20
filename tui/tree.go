package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type NodeType string

const (
	FolderNode NodeType = "folder"
	FileNode   NodeType = "file"
)

type TreeNode struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Type       NodeType   `json:"type"`
	Children   []TreeNode `json:"children"`
	IsExpanded bool       `json:"isExpanded"`
}

type Tree struct {
	RootName string
	Nodes    []TreeNode
}

type FlatNode struct {
	Node   *TreeNode
	Depth  int
	Index  int
	Parent *[]TreeNode
}

var idCounter int

func genID() string {
	idCounter++
	return fmt.Sprintf("node-%d", idCounter)
}

func newFolder(name string, children ...TreeNode) TreeNode {
	return TreeNode{ID: genID(), Name: name, Type: FolderNode, Children: children, IsExpanded: true}
}

func newFile(name string) TreeNode {
	return TreeNode{ID: genID(), Name: name, Type: FileNode, Children: nil, IsExpanded: false}
}

func (t *Tree) flatten() []FlatNode {
	var result []FlatNode
	var walk func(nodes []TreeNode, depth int, parent *[]TreeNode)
	walk = func(nodes []TreeNode, depth int, parent *[]TreeNode) {
		for i := range nodes {
			node := &nodes[i]
			result = append(result, FlatNode{Node: node, Depth: depth, Index: i, Parent: parent})
			if node.Type == FolderNode && node.IsExpanded {
				walk(node.Children, depth+1, &node.Children)
			}
		}
	}
	walk(t.Nodes, 0, &t.Nodes)
	return result
}

func (t *Tree) findNode(id string) *TreeNode {
	var search func(nodes []TreeNode) *TreeNode
	search = func(nodes []TreeNode) *TreeNode {
		for i := range nodes {
			if nodes[i].ID == id {
				return &nodes[i]
			}
			if nodes[i].Type == FolderNode {
				if found := search(nodes[i].Children); found != nil {
					return found
				}
			}
		}
		return nil
	}
	return search(t.Nodes)
}

func (t *Tree) findParent(id string) (*[]TreeNode, int) {
	var search func(nodes []TreeNode, parent *[]TreeNode) (*[]TreeNode, int)
	search = func(nodes []TreeNode, parent *[]TreeNode) (*[]TreeNode, int) {
		for i := range nodes {
			if nodes[i].ID == id {
				return parent, i
			}
			if nodes[i].Type == FolderNode {
				if p, idx := search(nodes[i].Children, &nodes[i].Children); p != nil {
					return p, idx
				}
			}
		}
		return nil, -1
	}
	return search(t.Nodes, &t.Nodes)
}

func (t *Tree) deleteNode(id string) bool {
	parent, idx := t.findParent(id)
	if parent == nil {
		return false
	}
	*parent = append((*parent)[:idx], (*parent)[idx+1:]...)
	return true
}

func (t *Tree) addChild(parentID string, node TreeNode) bool {
	if parentID == "" {
		t.Nodes = append(t.Nodes, node)
		return true
	}
	parent := t.findNode(parentID)
	if parent == nil || parent.Type != FolderNode {
		return false
	}
	parent.Children = append(parent.Children, node)
	parent.IsExpanded = true
	return true
}

func (t *Tree) moveNode(nodeID string, targetParentID string) bool {
	node := t.findNode(nodeID)
	if node == nil {
		return false
	}
	if targetParentID != "" {
		target := t.findNode(targetParentID)
		if target == nil || target.Type != FolderNode {
			return false
		}
		if isDescendant(node, targetParentID) {
			return false
		}
	}
	if !t.deleteNode(nodeID) {
		return false
	}
	return t.addChild(targetParentID, *node)
}

func isDescendant(node *TreeNode, targetID string) bool {
	if node.ID == targetID {
		return true
	}
	for i := range node.Children {
		if isDescendant(&node.Children[i], targetID) {
			return true
		}
	}
	return false
}

func (t *Tree) moveUpDown(id string, dir int) bool {
	parent, idx := t.findParent(id)
	if parent == nil {
		return false
	}
	newIdx := idx + dir
	if newIdx < 0 || newIdx >= len(*parent) {
		return false
	}
	(*parent)[idx], (*parent)[newIdx] = (*parent)[newIdx], (*parent)[idx]
	return true
}

func (t *Tree) duplicate(id string) bool {
	node := t.findNode(id)
	if node == nil {
		return false
	}
	parent, idx := t.findParent(id)
	if parent == nil {
		return false
	}
	clone := deepCloneNode(*node)
	*parent = append((*parent)[:idx+1], append([]TreeNode{clone}, (*parent)[idx+1:]...)...)
	return true
}

func deepCloneNode(node TreeNode) TreeNode {
	clone := TreeNode{
		ID:         genID(),
		Name:       node.Name,
		Type:       node.Type,
		IsExpanded: node.IsExpanded,
		Children:   nil,
	}
	if node.Type == FolderNode {
		clone.Children = make([]TreeNode, len(node.Children))
		for i := range node.Children {
			clone.Children[i] = deepCloneNode(node.Children[i])
		}
	}
	return clone
}

func (t *Tree) expandAll() {
	var walk func(nodes []TreeNode)
	walk = func(nodes []TreeNode) {
		for i := range nodes {
			if nodes[i].Type == FolderNode {
				nodes[i].IsExpanded = true
				walk(nodes[i].Children)
			}
		}
	}
	walk(t.Nodes)
}

func (t *Tree) collapseAll() {
	var walk func(nodes []TreeNode)
	walk = func(nodes []TreeNode) {
		for i := range nodes {
			if nodes[i].Type == FolderNode {
				nodes[i].IsExpanded = false
				walk(nodes[i].Children)
			}
		}
	}
	walk(t.Nodes)
}

func (t *Tree) stats() (folders, files, maxDepth, total int) {
	var walk func(nodes []TreeNode, depth int)
	walk = func(nodes []TreeNode, depth int) {
		if depth > maxDepth {
			maxDepth = depth
		}
		for i := range nodes {
			total++
			if nodes[i].Type == FolderNode {
				folders++
				walk(nodes[i].Children, depth+1)
			} else {
				files++
			}
		}
	}
	walk(t.Nodes, 1)
	return
}

func (t *Tree) toTreeText() string {
	var lines []string
	if t.RootName != "" {
		lines = append(lines, t.RootName+"/")
	}
	var walk func(nodes []TreeNode, prefix string)
	walk = func(nodes []TreeNode, prefix string) {
		for i := range nodes {
			isLast := i == len(nodes)-1
			connector := "├── "
			if isLast {
				connector = "└── "
			}
			suffix := ""
			if nodes[i].Type == FolderNode {
				suffix = "/"
			}
			lines = append(lines, prefix+connector+nodes[i].Name+suffix)
			if nodes[i].Type == FolderNode && len(nodes[i].Children) > 0 {
				nextPrefix := prefix
				if isLast {
					nextPrefix += "    "
				} else {
					nextPrefix += "│   "
				}
				walk(nodes[i].Children, nextPrefix)
			}
		}
	}
	walk(t.Nodes, "")
	return strings.Join(lines, "\n")
}

func (t *Tree) toMkdir() string {
	var lines []string
	lines = append(lines, "mkdir -p "+t.RootName)
	var walk func(nodes []TreeNode, path string)
	walk = func(nodes []TreeNode, path string) {
		for i := range nodes {
			fullPath := filepath.Join(t.RootName, path, nodes[i].Name)
			if nodes[i].Type == FolderNode {
				lines = append(lines, "mkdir -p "+fullPath)
			}
		}
		for i := range nodes {
			fullPath := filepath.Join(t.RootName, path, nodes[i].Name)
			if nodes[i].Type == FileNode {
				lines = append(lines, "touch "+fullPath)
			}
			if nodes[i].Type == FolderNode {
				walk(nodes[i].Children, filepath.Join(path, nodes[i].Name))
			}
		}
	}
	walk(t.Nodes, "")
	return strings.Join(lines, "\n")
}

func (t *Tree) toJSON() string {
	type jsonNode map[string]interface{}
	var convert func(node TreeNode) interface{}
	convert = func(node TreeNode) interface{} {
		if node.Type == FileNode {
			return nil
		}
		result := make(jsonNode)
		for _, child := range node.Children {
			result[child.Name] = convert(child)
		}
		return result
	}
	structure := make(jsonNode)
	for _, node := range t.Nodes {
		structure[node.Name] = convert(node)
	}
	out := map[string]interface{}{t.RootName: structure}
	b, _ := json.MarshalIndent(out, "", "  ")
	return string(b)
}

func parseTreeText(text string) Tree {
	lines := strings.Split(text, "\n")
	var filtered []string
	for _, l := range lines {
		if strings.TrimSpace(l) != "" {
			filtered = append(filtered, l)
		}
	}
	if len(filtered) == 0 {
		return Tree{RootName: "my-project", Nodes: nil}
	}

	rootName := strings.TrimSuffix(strings.TrimSpace(filtered[0]), "/")
	if rootName == "" {
		rootName = "my-project"
	}

	type stackItem struct {
		node  *TreeNode
		depth int
	}
	var result []TreeNode
	var stack []stackItem

	for i := 1; i < len(filtered); i++ {
		line := filtered[i]
		runes := []rune(line)
		depth := 0
		j := 0
		for j < len(runes) {
			if runes[j] == '│' || runes[j] == ' ' {
				depth++
				j++
			} else if runes[j] == '├' || runes[j] == '└' {
				j += 4
				break
			} else {
				break
			}
		}
		depth = depth / 4

		name := strings.TrimSpace(string(runes[j:]))
		if name == "" {
			continue
		}
		isFolder := strings.HasSuffix(name, "/")
		cleanName := strings.TrimSuffix(name, "/")

		var node TreeNode
		if isFolder {
			node = newFolder(cleanName)
		} else {
			node = newFile(cleanName)
		}

		if depth == 0 {
			result = append(result, node)
			if isFolder {
				stack = []stackItem{{node: &result[len(result)-1], depth: 0}}
			}
		} else {
			for len(stack) > 0 && stack[len(stack)-1].depth >= depth {
				stack = stack[:len(stack)-1]
			}
			if len(stack) > 0 {
				parent := stack[len(stack)-1].node
				parent.Children = append(parent.Children, node)
				if isFolder {
					stack = append(stack, stackItem{node: &parent.Children[len(parent.Children)-1], depth: depth})
				}
			} else {
				result = append(result, node)
				if isFolder {
					stack = []stackItem{{node: &result[len(result)-1], depth: depth}}
				}
			}
		}
	}

	return Tree{RootName: rootName, Nodes: result}
}

func scanDir(path string) (Tree, error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return Tree{}, err
	}
	info, err := os.Stat(absPath)
	if err != nil {
		return Tree{}, err
	}
	rootName := info.Name()
	if rootName == "." {
		rootName = filepath.Base(absPath)
	}

	var walk func(string) []TreeNode
	walk = func(dir string) []TreeNode {
		entries, err := os.ReadDir(dir)
		if err != nil {
			return nil
		}
		var nodes []TreeNode
		for _, entry := range entries {
			name := entry.Name()
			if strings.HasPrefix(name, ".") && name != ".github" && name != ".vscode" {
				continue
			}
			if entry.IsDir() {
				nodes = append(nodes, newFolder(name, walk(filepath.Join(dir, name))...))
			} else {
				nodes = append(nodes, newFile(name))
			}
		}
		sort.Slice(nodes, func(i, j int) bool {
			if nodes[i].Type == nodes[j].Type {
				return nodes[i].Name < nodes[j].Name
			}
			return nodes[i].Type == FolderNode
		})
		return nodes
	}

	return Tree{RootName: rootName, Nodes: walk(absPath)}, nil
}

func (t *Tree) clone() Tree {
	nodes := make([]TreeNode, len(t.Nodes))
	for i := range t.Nodes {
		nodes[i] = deepCloneNode(t.Nodes[i])
	}
	return Tree{RootName: t.RootName, Nodes: nodes}
}
