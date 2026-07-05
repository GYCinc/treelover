import * as fs from 'fs';
import * as path from 'path';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children: TreeNode[];
}

/**
 * treeLover Compiler: Compiles a directory structure representing canals/gates
 * into native Rust source code.
 */
export function compileTreeToRust(rootName: string, nodes: TreeNode[]): string {
  let rustCode = `// Generated natively by treeLover v.forever_Alpha\n\n`;
  
  // Base structural imports
  rustCode += `#[derive(Debug, Clone)]\n`;
  rustCode += `pub struct SiphonState {\n`;
  rustCode += `    pub data: String,\n`;
  rustCode += `    pub level: usize,\n`;
  rustCode += `}\n\n`;

  // Recursive block compiler representing UK Canal Gates
  function compileNode(node: TreeNode, depth: number): string {
    const indent = '    '.repeat(depth);
    let output = '';

    if (node.type === 'folder') {
      const moduleName = node.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      output += `${indent}// Canal Gate (Lock): ${node.name}\n`;
      output += `${indent}pub mod ${moduleName} {\n`;
      output += `${indent}    use super::SiphonState;\n\n`;
      
      // Every folder has its local siphon function
      output += `${indent}    pub fn siphon(state: &mut SiphonState) {\n`;
      output += `${indent}        state.level += 1;\n`;
      output += `${indent}        println!("[Gate Level {}] Flowing through lock: {}", state.level, "${node.name}");\n`;
      
      // Process children logic inside the siphon canal
      for (const child of node.children) {
        if (child.type === 'folder') {
          const childMod = child.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          output += `${indent}        ${childMod}::siphon(state);\n`;
        } else {
          // File acting as digital siphon draining logic
          const cleanFileName = child.name.replace(/\.[^/.]+$/, "");
          output += `${indent}        // Siphon logic drain: ${child.name}\n`;
          output += `${indent}        state.data.push_str(" -> ${cleanFileName}");\n`;
        }
      }
      
      output += `${indent}        state.level -= 1;\n`;
      output += `${indent}    }\n`;
      
      // Nested modules definitions
      for (const child of node.children) {
        if (child.type === 'folder') {
          output += '\n' + compileNode(child, depth + 1);
        }
      }
      
      output += `${indent}}\n`;
    }
    return output;
  }

  // Root canal system activation
  rustCode += `// Root System Gate: ${rootName}\n`;
  rustCode += `pub mod root_system {\n`;
  rustCode += `    use super::SiphonState;\n\n`;
  rustCode += `    pub fn flow() -> SiphonState {\n`;
  rustCode += `        let mut state = SiphonState { data: "start".to_string(), level: 0 };\n`;
  
  // Start the upstream flow through main nodes
  for (const node of nodes) {
    if (node.type === 'folder') {
      const modName = node.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      rustCode += `        ${modName}::siphon(&mut state);\n`;
    } else {
      const cleanName = node.name.replace(/\.[^/.]+$/, "");
      rustCode += `        state.data.push_str(" -> ${cleanName}");\n`;
    }
  }
  
  rustCode += `        state\n`;
  rustCode += `    }\n\n`;
  
  // Render modules
  for (const node of nodes) {
    if (node.type === 'folder') {
      rustCode += compileNode(node, 1) + '\n';
    }
  }
  rustCode += `}\n\n`;

  // Main runner
  rustCode += `fn main() {\n`;
  rustCode += `    println!("--- Digital Siphon Canal Flowing ---");\n`;
  rustCode += `    let final_state = root_system::flow();\n`;
  rustCode += `    println!("Final Siphoned Data Flow Output: {}", final_state.data);\n`;
  rustCode += `}\n`;

  return rustCode;
}

// CLI entry point
if (require.main === module) {
  const jsonPath = process.argv[2];
  const outputPath = process.argv[3] || 'src/main.rs';
  
  if (!jsonPath) {
    console.error("Usage: bun run scripts/compile-tree.ts <path-to-tree-json> [output-path]");
    process.exit(1);
  }
  
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw);
    const compiled = compileTreeToRust(data.rootName || 'canal_root', data.nodes || []);
    
    // Ensure output directories exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, compiled, 'utf-8');
    console.log(`\n[treeLover Compiler] Successfully compiled tree to native Rust: ${outputPath}`);
  } catch (e: any) {
    console.error("Compilation error:", e.message);
    process.exit(1);
  }
}
