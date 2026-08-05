import { EventEmitter } from 'events';

class WorkflowEvents extends EventEmitter {}

export const workflowEvents = new WorkflowEvents();
export const WORKFLOW_RUN_UPDATE = 'workflow_run_update';
export const WORKFLOW_RUN_LOG = 'workflow_run_log';
