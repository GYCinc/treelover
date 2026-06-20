package main

import (
	"strings"
	"testing"
)

func TestTreeBasicOps(t *testing.T) {
	tr := Tree{RootName: "test"}
	n1 := newFolder("src", newFile("main.go"))
	n2 := newFile("README.md")
	tr.Nodes = []TreeNode{n1, n2}

	// flatten
	flat := tr.flatten()
	if len(flat) != 3 {
		t.Fatalf("expected 3 flat nodes, got %d", len(flat))
	}
	if flat[0].Node.Name != "src" {
		t.Fatalf("expected src, got %s", flat[0].Node.Name)
	}
	if flat[1].Node.Name != "main.go" {
		t.Fatalf("expected main.go, got %s", flat[1].Node.Name)
	}

	// stats
	folders, files, maxDepth, total := tr.stats()
	if folders != 1 || files != 2 || maxDepth != 2 || total != 3 {
		t.Fatalf("stats wrong: folders=%d files=%d depth=%d total=%d", folders, files, maxDepth, total)
	}
}

func TestTreeExport(t *testing.T) {
	tr := Tree{RootName: "my-app"}
	tr.Nodes = []TreeNode{
		newFolder("src", newFile("main.go")),
		newFile("README.md"),
	}

	treeText := tr.toTreeText()
	if !strings.Contains(treeText, "my-app/") {
		t.Fatalf("tree text missing root: %s", treeText)
	}
	if !strings.Contains(treeText, "src/") {
		t.Fatalf("tree text missing src: %s", treeText)
	}

	mkdirText := tr.toMkdir()
	if !strings.Contains(mkdirText, "mkdir -p my-app") {
		t.Fatalf("mkdir missing root: %s", mkdirText)
	}
	if !strings.Contains(mkdirText, "touch my-app/README.md") {
		t.Fatalf("mkdir missing file: %s", mkdirText)
	}

	jsonText := tr.toJSON()
	if !strings.Contains(jsonText, `"my-app"`) {
		t.Fatalf("json missing root: %s", jsonText)
	}
}

func TestTreeImport(t *testing.T) {
	input := `my-project/
├── src/
│   └── main.go
└── README.md`
	tr := parseTreeText(input)
	if tr.RootName != "my-project" {
		t.Fatalf("expected root my-project, got %s", tr.RootName)
	}
	if len(tr.Nodes) != 2 {
		t.Fatalf("expected 2 top nodes, got %d", len(tr.Nodes))
	}
	flat := tr.flatten()
	foundMain := false
	for _, fn := range flat {
		if fn.Node.Name == "main.go" {
			foundMain = true
		}
	}
	if !foundMain {
		t.Fatalf("did not find main.go after import")
	}
}

func TestTreeMove(t *testing.T) {
	tr := Tree{RootName: "test"}
	a := newFolder("a", newFile("f1"))
	b := newFolder("b")
	tr.Nodes = []TreeNode{a, b}

	// move f1 into b
	f1ID := tr.Nodes[0].Children[0].ID
	bID := tr.Nodes[1].ID
	ok := tr.moveNode(f1ID, bID)
	if !ok {
		t.Fatal("moveNode failed")
	}
	if len(tr.Nodes[0].Children) != 0 {
		t.Fatalf("expected a to be empty, has %d children", len(tr.Nodes[0].Children))
	}
	if len(tr.Nodes[1].Children) != 1 {
		t.Fatalf("expected b to have 1 child, has %d", len(tr.Nodes[1].Children))
	}
}

func TestTreeDuplicate(t *testing.T) {
	tr := Tree{RootName: "test"}
	tr.Nodes = []TreeNode{newFolder("src", newFile("main.go"))}
	tr.duplicate(tr.Nodes[0].ID)
	if len(tr.Nodes) != 2 {
		t.Fatalf("expected 2 nodes after duplicate, got %d", len(tr.Nodes))
	}
}

func TestHistory(t *testing.T) {
	h := History{}
	t1 := Tree{RootName: "v1", Nodes: []TreeNode{newFile("a")}}
	t2 := Tree{RootName: "v2", Nodes: []TreeNode{newFile("b")}}
	t3 := Tree{RootName: "v3", Nodes: []TreeNode{newFile("c")}}

	h.Push(t1)
	h.Push(t2)
	h.Push(t3)

	if !h.CanUndo() {
		t.Fatal("should be able to undo")
	}
	ut := h.Undo()
	if ut == nil || ut.RootName != "v2" {
		t.Fatalf("undo wrong, got %+v", ut)
	}
	if !h.CanRedo() {
		t.Fatal("should be able to redo")
	}
	rt := h.Redo()
	if rt == nil || rt.RootName != "v3" {
		t.Fatalf("redo wrong, got %+v", rt)
	}
}

func TestTemplates(t *testing.T) {
	if len(templates) == 0 {
		t.Fatal("no templates defined")
	}
	for _, tmpl := range templates {
		if tmpl.RootName == "" {
			t.Fatalf("template %s has no root name", tmpl.ID)
		}
	}
}
