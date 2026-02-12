export type WorkerTaskPayload = unknown;
export type WorkerTaskResult = unknown;
export type WorkerTaskHandler<TIn = WorkerTaskPayload, TOut = WorkerTaskResult> = (
  payload: TIn,
) => TOut | Promise<TOut>;

export interface WorkerTaskRequest<TIn = WorkerTaskPayload> {
  __workerTask: true;
  id: number;
  task: string;
  payload: TIn;
}

export interface WorkerTaskResponse<TOut = WorkerTaskResult> {
  __workerTask: true;
  id: number;
  ok: boolean;
  result?: TOut;
  error?: string;
}

const taskHandlers = new Map<string, WorkerTaskHandler>();

export function registerWorkerTask<TIn = WorkerTaskPayload, TOut = WorkerTaskResult>(
  name: string,
  handler: WorkerTaskHandler<TIn, TOut>,
): void {
  taskHandlers.set(name, handler as WorkerTaskHandler);
}

export function hasWorkerTask(name: string): boolean {
  return taskHandlers.has(name);
}

export async function executeWorkerTask<TIn = WorkerTaskPayload, TOut = WorkerTaskResult>(
  name: string,
  payload: TIn,
): Promise<TOut> {
  const handler = taskHandlers.get(name);
  if (!handler) {
    throw new Error(`No worker task registered for "${name}"`);
  }
  return (await handler(payload)) as TOut;
}

export function isWorkerTaskRequest(value: unknown): value is WorkerTaskRequest {
  return typeof value === "object" && value !== null && (value as WorkerTaskRequest).__workerTask === true;
}

