import pino from 'pino';

// Choose pino-pretty for development environments
const transport = process.env.NODE_ENV !== 'production'
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

// Helper type and wrapper for node-specific context
export interface LogContext {
  workflowId?: string;
  runId?: string;
  nodeId?: string;
}

export const log = {
  info: (ctx: LogContext, msg: string, ...args: any[]) => {
    logger.info({ ...ctx }, msg, ...args);
  },
  error: (ctx: LogContext, msg: string, ...args: any[]) => {
    logger.error({ ...ctx }, msg, ...args);
  },
  warn: (ctx: LogContext, msg: string, ...args: any[]) => {
    logger.warn({ ...ctx }, msg, ...args);
  },
  debug: (ctx: LogContext, msg: string, ...args: any[]) => {
    logger.debug({ ...ctx }, msg, ...args);
  },
};
