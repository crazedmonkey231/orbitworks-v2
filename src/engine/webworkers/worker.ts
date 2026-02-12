import "./tasks";
import { executeWorkerTask, isWorkerTaskRequest, WorkerTaskResponse } from "./task-registry";

// Dedicated worker task dispatcher. All task handlers live in webworkers/tasks.ts.
self.onmessage = async (event: MessageEvent<unknown>) => {
  const data = event.data;
  if (!isWorkerTaskRequest(data)) {
    return;
  }

  try {
    const result = await executeWorkerTask(data.task, data.payload);
    const response: WorkerTaskResponse = {
      __workerTask: true,
      id: data.id,
      ok: true,
      result,
    };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerTaskResponse = {
      __workerTask: true,
      id: data.id,
      ok: false,
      error: error instanceof Error ? error.message : "Worker task failed",
    };
    self.postMessage(response);
  }
};
