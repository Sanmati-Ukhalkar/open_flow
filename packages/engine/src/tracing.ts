import crypto from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  runId?: string;
  workflowId?: string;
  orgId?: string;
}

export interface TraceSpan {
  context: TraceContext;
  name: string;
  startTime: number;
  attributes: Record<string, any>;
  endTime?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  error?: string;
}

/**
 * Generate a new W3C-compliant TraceContext
 */
export function createTraceContext(
  overrides: Partial<TraceContext> = {}
): TraceContext {
  return {
    traceId: overrides.traceId || crypto.randomBytes(16).toString('hex'),
    spanId: crypto.randomBytes(8).toString('hex'),
    parentSpanId: overrides.spanId,
    runId: overrides.runId,
    workflowId: overrides.workflowId,
    orgId: overrides.orgId
  };
}

/**
 * Start a telemetry span for tracking workflow DAG and node executions
 */
export function startTraceSpan(
  name: string,
  parentContext?: TraceContext,
  attributes: Record<string, any> = {}
): TraceSpan {
  const context = createTraceContext(parentContext);
  return {
    context,
    name,
    startTime: Date.now(),
    attributes: {
      ...attributes,
      otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'none',
      sentryDsn: process.env.SENTRY_DSN ? 'configured' : 'none'
    },
    status: 'ok'
  };
}

/**
 * End a telemetry span and compute execution duration
 */
export function endTraceSpan(
  span: TraceSpan,
  status: 'ok' | 'error' = 'ok',
  error?: string
): TraceSpan {
  span.endTime = Date.now();
  span.durationMs = span.endTime - span.startTime;
  span.status = status;
  if (error) {
    span.error = error;
  }
  return span;
}
