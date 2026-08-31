export interface WorkflowBundle {
  version: string;
  name: string;
  exportedAt: string;
  graph: {
    nodes: any[];
    edges: any[];
  };
  secretPlaceholders: string[];
}

/**
 * Export workflow graph as a JSON bundle with raw secret values redacted
 * and replaced with {{SECRET_*}} reference tokens.
 */
export function exportWorkflowBundle(name: string, graph: { nodes: any[]; edges: any[] }): WorkflowBundle {
  const secretPlaceholdersSet = new Set<string>();
  const nodes = JSON.parse(JSON.stringify(graph.nodes || []));

  for (const node of nodes) {
    if (node.data?.config) {
      const config = node.data.config;
      for (const [key, val] of Object.entries(config)) {
        if (
          typeof val === 'string' &&
          (key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('password'))
        ) {
          if (val.trim() !== '' && !val.startsWith('{{SECRET_')) {
            const placeholder = `{{SECRET_${key.toUpperCase()}}}`;
            secretPlaceholdersSet.add(placeholder);
            config[key] = placeholder;
          }
        }
      }
    }
  }

  return {
    version: '1.0.0',
    name,
    exportedAt: new Date().toISOString(),
    graph: {
      nodes,
      edges: graph.edges || []
    },
    secretPlaceholders: Array.from(secretPlaceholdersSet)
  };
}

/**
 * Validate imported workflow bundle schema
 */
export function validateWorkflowBundle(bundle: any): { valid: boolean; error?: string } {
  if (!bundle || typeof bundle !== 'object') {
    return { valid: false, error: 'Invalid bundle payload.' };
  }
  if (!bundle.graph || !Array.isArray(bundle.graph.nodes) || !Array.isArray(bundle.graph.edges)) {
    return { valid: false, error: 'Bundle must contain graph with nodes and edges arrays.' };
  }
  return { valid: true };
}
