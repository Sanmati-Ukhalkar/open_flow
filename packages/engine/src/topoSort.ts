export interface DAGNode {
  id: string;
  [key: string]: any;
}

export interface DAGEdge {
  source: string;
  target: string;
  [key: string]: any;
}

/**
 * Topologically sorts workflow nodes based on connections.
 * Throws an error if a cycle is detected.
 */
export function topoSort<T extends DAGNode = DAGNode>(nodes: T[], edges: DAGEdge[]): T[] {
  const adjList: Map<string, string[]> = new Map();
  const inDegree: Map<string, number> = new Map();
  const nodeMap: Map<string, T> = new Map();

  // Initialize
  for (const node of nodes) {
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
    nodeMap.set(node.id, node);
  }

  // Build adjacency list and in-degrees
  for (const edge of edges) {
    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      adjList.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // Find all nodes with 0 in-degree
  const queue: string[] = [];
  for (const node of nodes) {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
    }
  }

  const sortedNodeIds: string[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    sortedNodeIds.push(u);

    const neighbors = adjList.get(u) || [];
    for (const v of neighbors) {
      inDegree.set(v, inDegree.get(v)! - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    }
  }

  // Cycle check
  if (sortedNodeIds.length !== nodes.length) {
    throw new Error("Cycle detected in workflow! Connections must form a Directed Acyclic Graph (DAG).");
  }

  return sortedNodeIds.map(id => nodeMap.get(id)!);
}
