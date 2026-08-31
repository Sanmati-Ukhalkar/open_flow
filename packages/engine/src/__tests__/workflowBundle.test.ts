import { describe, it, expect } from 'vitest';
import { exportWorkflowBundle, validateWorkflowBundle } from '../workflowBundle';

describe('Workflow Bundle Export/Import & Secret Redaction', () => {
  it('should redact sensitive credential values and produce {{SECRET_*}} placeholders', () => {
    const graph = {
      nodes: [
        {
          id: 'llm-1',
          type: 'llm-prompt',
          data: {
            config: {
              apiKey: 'sk-proj-123456789',
              prompt: 'Say hello'
            }
          }
        }
      ],
      edges: []
    };

    const bundle = exportWorkflowBundle('Test Workflow', graph);

    expect(bundle.version).toBe('1.0.0');
    expect(bundle.secretPlaceholders).toContain('{{SECRET_APIKEY}}');
    expect(bundle.graph.nodes[0].data.config.apiKey).toBe('{{SECRET_APIKEY}}');
    expect(bundle.graph.nodes[0].data.config.prompt).toBe('Say hello');
  });

  it('should validate valid and invalid workflow bundle structures', () => {
    const valid = validateWorkflowBundle({
      version: '1.0.0',
      graph: { nodes: [], edges: [] }
    });
    expect(valid.valid).toBe(true);

    const invalid = validateWorkflowBundle({ foo: 'bar' });
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toBeDefined();
  });
});
