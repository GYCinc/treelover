import * as fs from 'fs';
import * as path from 'path';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children: TreeNode[];
}

/**
 * Paddle Compiler: Compiles a directory structure representing Canals, Locks, and Bridges
 * into native Rust source code.
 */
export function compileTreeToRust(rootName: string, nodes: TreeNode[]): string {
  let rustCode = `// Generated natively by Paddle v.forever_Alpha\n\n`;
  
  // Base structural imports
  rustCode += `#[derive(Debug, Clone)]\n`;
  rustCode += `pub struct PaddleFlowState {\n`;
  rustCode += `    pub stream_path: String,\n`;
  rustCode += `    pub lock_depth: usize,\n`;
  rustCode += `    pub bridges_passed: usize,\n`;
  rustCode += `}\n\n`;

  // Recursive block compiler representing UK Canal System
  function compileNode(node: TreeNode, depth: number): string {
    const indent = '    '.repeat(depth);
    let output = '';

    if (node.type === 'folder') {
      const moduleName = node.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      output += `${indent}// Canal Lock Section: ${node.name}\n`;
      output += `${indent}pub mod ${moduleName} {\n`;
      output += `${indent}    use super::PaddleFlowState;\n\n`;
      
      // Every folder has its local flow function
      output += `${indent}    pub fn paddle_flow(state: &mut PaddleFlowState) {\n`;
      output += `${indent}        state.lock_depth += 1;\n`;
      output += `${indent}        println!("[Lock Level {}] Opening gates for: {}", state.lock_depth, "${node.name}");\n`;
      
      // Process children logic inside the canal
      for (const child of node.children) {
        if (child.type === 'folder') {
          const childMod = child.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          output += `${indent}        ${childMod}::paddle_flow(state);\n`;
        } else {
          const cleanFileName = child.name.replace(/\.[^/.]+$/, "");
          if (cleanFileName.toLowerCase().includes('bridge')) {
            output += `${indent}        // Bridge crossing over the canal: ${child.name}\n`;
            output += `${indent}        state.bridges_passed += 1;\n`;
            output += `${indent}        state.stream_path.push_str(" =(under bridge)=> ${cleanFileName}");\n`;
          } else {
            output += `${indent}        // Paddle gate drain operation: ${child.name}\n`;
            output += `${indent}        state.stream_path.push_str(" -> ${cleanFileName}");\n`;
          }
        }
      }
      
      output += `${indent}        state.lock_depth -= 1;\n`;
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
  rustCode += `// Canal Network Entry: ${rootName}\n`;
  rustCode += `pub mod canal_network {\n`;
  rustCode += `    use super::PaddleFlowState;\n\n`;
  rustCode += `    pub fn flow_to_ocean() -> PaddleFlowState {\n`;
  rustCode += `        let mut state = PaddleFlowState {\n`;
  rustCode += `            stream_path: "headwaters".to_string(),\n`;
  rustCode += `            lock_depth: 0,\n`;
  rustCode += `            bridges_passed: 0,\n`;
  rustCode += `        };\n`;
  
  // Start the upstream flow through main nodes
  for (const node of nodes) {
    if (node.type === 'folder') {
      const modName = node.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      rustCode += `        ${modName}::paddle_flow(&mut state);\n`;
    } else {
      const cleanName = node.name.replace(/\.[^/.]+$/, "");
      if (cleanName.toLowerCase().includes('bridge')) {
        rustCode += `        state.bridges_passed += 1;\n`;
        rustCode += `        state.stream_path.push_str(" =(under bridge)=> ${cleanName}");\n`;
      } else {
        rustCode += `        state.stream_path.push_str(" -> ${cleanName}");\n`;
      }
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
  rustCode += `    println!("--- Canal flow initialized. Paddles open! ---");\n`;
  rustCode += `    let final_state = canal_network::flow_to_ocean();\n`;
  rustCode += `    println!("Flow Complete. Reach Ocean Bay.");\n`;
  rustCode += `    println!("Stream path: {}", final_state.stream_path);\n`;
  rustCode += `    println!("Bridges sailed under: {}", final_state.bridges_passed);\n\n`;

  // Detect DOOM activation in the tree
  const hasDoom = JSON.stringify(nodes).toLowerCase().includes('doom') || rootName.toLowerCase().includes('doom');
  if (hasDoom) {
    rustCode += `    // DOOM CANAL MODE ACTIVATED\n`;
    rustCode += `    println!("\\n[DOOM CANAL TRIGGERED] Booting E1M1 corridor walk...");\n`;
    rustCode += `    std::thread::sleep(std::time::Duration::from_millis(150));\n`;
    rustCode += `    let frames = vec![\n`;
    rustCode += `        "\\x1b[2J\\x1b[H\\n  +------------------------------------+\\n  |  .   .  .   .  .  .   .  .   .  .  |\\n  |  |\\\\_/|   |\\\\_/|   |\\\\_/|   |\\\\_/|   |\\n  |  | o o |   | o o |   | o o |   | o o | |\\n  |  (  v  )   (  v  )   (  v  )   (  v  ) |\\n  |   \\\\___/     \\\\___/     \\\\___/     \\\\___/  |\\n  |                                    |\\n  |        [  +  ]  CROSSHAIR          |\\n  +------------------------------------+\\n  | AMMO: 50 | HEALTH: 100% | ARMOR: 80% |\\n  +------------------------------------+\\n",\n`;
    rustCode += `        "\\x1b[2J\\x1b[H\\n  +------------------------------------+\\n  |  .   .  .   .  .  .   .  .   .  .  |\\n  |       |\\\\_/|            |\\\\_/|       |\\n  |       | - - |   (!!!)   | - - |      |\\n  |       (  v  )   CACO!   (  v  )      |\\n  |        \\\\___/            \\\\___/       |\\n  |                \\\\ _ /                |\\n  |               - (o.o) -              |\\n  |        [  +  ]   / \\\\                |\\n  +------------------------------------+\\n  | AMMO: 49 | HEALTH: 100% | ARMOR: 80% |\\n  +------------------------------------+\\n",\n`;
    rustCode += `        "\\x1b[2J\\x1b[H\\n  +------------------------------------+\\n  |  .   .  .   .  .  .   .  .   .  .  |\\n  |       |\\\\_/|            |\\\\_/|       |\\n  |       | x x |  *BOOM*   | x x |      |\\n  |       (  -  )  *SPLT*   (  -  )      |\\n  |        \\\\___/            \\\\___/       |\\n  |                 \\\\|/                 |\\n  |                (x.x)                 |\\n  |        [  *  ]   / \\\\                |\\n  +------------------------------------+\\n  | AMMO: 48 | HEALTH: 95%  | ARMOR: 76% |\\n  +------------------------------------+\\n"\n`;
    rustCode += `    ];\n`;
    rustCode += `    for frame in frames {\n`;
    rustCode += `        print!("{}", frame);\n`;
    rustCode += `        std::io::Write::flush(&mut std::io::stdout()).unwrap();\n`;
    rustCode += `        std::thread::sleep(std::time::Duration::from_millis(100));\n`;
    rustCode += `    }\n`;
    rustCode += `    println!("E1M1 Canal Run Complete. Doom Guy sailed safely.");\n`;
  }
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
