import { describe, it, expect } from 'vitest';
import { createTraceContext, startTraceSpan, endTraceSpan } from '../tracing';

describe('Distributed Tracing & Telemetry (Issue #13)', () => {
  it('should generate valid W3C trace context hex IDs', () => {
    const ctx = createTraceContext({ runId: 'run-123', workflowId: 'wf-456' });
    expect(ctx.traceId).toMatch(/^[a-f0-9]{32}$/);
    expect(ctx.spanId).toMatch(/^[a-f0-9]{16}$/);
    expect(ctx.runId).toBe('run-123');
  });

  it('should track span execution time and status', async () => {
    const parentCtx = createTraceContext({ runId: 'run-789' });
    const span = startTraceSpan('execute-node-llm', parentCtx, { nodeId: 'node-1' });

    await new Promise((r) => setTimeout(r, 10));

    const endedSpan = endTraceSpan(span, 'ok');

    expect(endedSpan.durationMs).toBeGreaterThanOrEqual(5);
    expect(endedSpan.status).toBe('ok');
    expect(endedSpan.attributes.nodeId).toBe('node-1');
  });
});
