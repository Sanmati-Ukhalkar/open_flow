const fs = require('fs');

const path = 'c:\\Projects\\open_flow\\src\\server\\engine.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Extract evaluateNode block
const startPattern = `            if (node.type === 'llm-prompt') {`;
const endPattern = `            // Output Validation`;

const startIndex = code.indexOf(startPattern);
const endIndex = code.indexOf(endPattern);

if (startIndex === -1 || endIndex === -1) {
  console.error('Failed to find replace block');
  process.exit(1);
}

const blockToExtract = code.substring(startIndex, endIndex);

const evaluateNodeFn = `
export async function evaluateNode(node: any, nodeInput: any, orgId: string): Promise<any> {
  let output: any;
${blockToExtract.split('\\n').map(line => line.substring(12)).join('\\n')}
  return output;
}

export async function executeLoopSubgraph(
  loopNode: any,
  loopInput: any,
  orgId: string,
  allNodes: any[],
  allEdges: any[]
): Promise<any> {
  const { listPath, nodesInLoop, resultNode } = loopNode.data.config;
  
  const keys = (listPath || '').split('.').filter(Boolean);
  let list = loopInput;
  for (const k of keys) {
    if (list) list = list[k];
  }
  
  if (!Array.isArray(list)) {
    throw new Error(\`List path "\${listPath}" does not resolve to an array\`);
  }

  const nodeIds = (nodesInLoop || '').split(',').map((s: string) => s.trim());
  const subgraphNodes = allNodes.filter((n: any) => nodeIds.includes(n.id));
  const subgraphEdges = allEdges.filter((e: any) => nodeIds.includes(e.source) && nodeIds.includes(e.target));
  
  const results = [];
  
  for (const item of list) {
    const sortedNodes = topoSort(subgraphNodes, subgraphEdges);
    const nodeOutputs = new Map<string, any>();
    
    for (const node of sortedNodes) {
      const incomingEdges = subgraphEdges.filter((e: any) => e.target === node.id);
      let nodeInput: any = {};
      
      if (incomingEdges.length === 0) {
        nodeInput = { ...loopInput, item };
      } else if (incomingEdges.length === 1) {
        nodeInput = nodeOutputs.get(incomingEdges[0].source) || {};
      } else {
        nodeInput = incomingEdges.reduce((acc: any, edge: any) => {
          acc[edge.source] = nodeOutputs.get(edge.source) || {};
          return acc;
        }, {} as Record<string, any>);
      }
      
      if (node.type === 'loop') {
         // Prevent recursive loops for now
         nodeOutputs.set(node.id, { results: [] });
         continue;
      }

      const output = await evaluateNode(node, nodeInput, orgId);
      nodeOutputs.set(node.id, output);
    }
    
    if (resultNode && nodeOutputs.has(resultNode)) {
      results.push(nodeOutputs.get(resultNode));
    }
  }
  
  return { results };
}
`;

// Insert the functions right before executeRunBackend
const insertPoint = code.indexOf('export async function executeRunBackend');
code = code.substring(0, insertPoint) + evaluateNodeFn + '\\n' + code.substring(insertPoint);

// Replace the original block with a call to evaluateNode and executeLoopSubgraph
const newBlock = `
            if (node.type === 'loop') {
              output = await executeLoopSubgraph(node, nodeInput, orgId, nodes, edges);
            } else {
              output = await evaluateNode(node, nodeInput, orgId);
            }
`;

const updatedCode = code.replace(blockToExtract, newBlock);

fs.writeFileSync(path, updatedCode);
console.log('Refactor complete');
