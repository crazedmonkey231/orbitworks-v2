// Web Worker management for offloading tasks from the main thread
import "./webworkers/tasks";
import {
  executeWorkerTask,
  hasWorkerTask,
  isWorkerTaskRequest,
  WorkerTaskRequest,
  WorkerTaskResponse,
} from "./webworkers/task-registry";

/** 
 * A Toiler class representing an object that can post messages and be terminated.
 * This is used in case webworkers are unavailable and we want to use a fallback implementation that mimics the worker API.
 */
export class Toiler {
  private taskName: string;

  constructor(taskName: string, options?: WorkerOptions) {
    this.taskName = taskName;
    console.warn("Toiler created as a fallback for Web Workers. This will run tasks on the main thread.");
  }
  postMessage(message: unknown, transfer?: Transferable[]) {
    if (!isWorkerTaskRequest(message)) {
      return;
    }

    const request = message as WorkerTaskRequest;
    if (request.task !== this.taskName) {
      const mismatchResponse: WorkerTaskResponse = {
        __workerTask: true,
        id: request.id,
        ok: false,
        error: `Task mismatch: expected "${this.taskName}", got "${request.task}"`,
      };
      this.onmessage?.(new MessageEvent("message", { data: mismatchResponse }));
      return;
    }

    void executeWorkerTask(this.taskName, request.payload)
      .then((result) => {
        const response: WorkerTaskResponse = {
          __workerTask: true,
          id: request.id,
          ok: true,
          result,
        };
        this.onmessage?.(new MessageEvent("message", { data: response }));
      })
      .catch((error) => {
        const response: WorkerTaskResponse = {
          __workerTask: true,
          id: request.id,
          ok: false,
          error: error instanceof Error ? error.message : "Toiler task failed",
        };
        this.onmessage?.(new MessageEvent("message", { data: response }));
      });
  }
  onmessage: ((this: Toiler, ev: MessageEvent) => any) | null = null;
  onerror: ((this: Toiler, ev: ErrorEvent) => any) | null = null;
  onmessageerror: ((this: Toiler, ev: MessageEvent) => any) | null = null;
  terminate() {
    console.log("Toiler terminated");
  }
}

/** Type representing either a standard Worker or a Toiler fallback */
export type WorkerLike = Worker | Toiler;

/** 
 * WebWorkerHandle class a wrapper to handle sending messages to the worker.
 */
export class WebWorkerHandle {
  id: string;
  worker: WorkerLike;
  private taskName: string;
  private requestId = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();

  constructor(id: string, worker: WorkerLike, taskName: string) {
    this.id = id;
    this.worker = worker;
    this.taskName = taskName;
    this.worker.onmessage = (event: MessageEvent<unknown>) => this.handleMessage(event);
    this.worker.onerror = (error: ErrorEvent) => {
      console.error(`Error in worker ${this.id}:`, error);
    };
    this.worker.onmessageerror = (error: MessageEvent) => {
      console.error(`Message error in worker ${this.id}:`, error);
    };
  }

  run<TIn = unknown, TOut = unknown>(payload: TIn): Promise<TOut> {
    const id = ++this.requestId;
    const request: WorkerTaskRequest<TIn> = {
      __workerTask: true,
      id,
      task: this.taskName,
      payload,
    };

    return new Promise<TOut>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(request, []);
    });
  }

  terminate() {
    for (const pending of this.pending.values()) {
      pending.reject(new Error(`Worker ${this.id} terminated before response`));
    }
    this.pending.clear();
    this.worker.terminate();
    this.worker = null as any;
  }

  private handleMessage(event: MessageEvent<unknown>) {
    const data = event.data;
    if (!data || typeof data !== "object" || (data as WorkerTaskResponse).__workerTask !== true) {
      return;
    }

    const response = data as WorkerTaskResponse;
    const pending = this.pending.get(response.id);
    if (!pending) {
      return;
    }

    this.pending.delete(response.id);
    if (response.ok) {
      pending.resolve(response.result);
      return;
    }
    pending.reject(new Error(response.error || "Worker task failed"));
  }
}

/** 
 * WebWorkerManager class to manage multiple workers.
 * Includes methods to add, remove, and get workers, as well as a method to create new workers with specified URLs and options.
 */
export class WebWorkerManager {
  private workers: Record<string, WebWorkerHandle> = {};

  addWorker(id: string, worker: WorkerLike): WebWorkerHandle {
    this.workers[id] = new WebWorkerHandle(id, worker, "echo");
    return this.workers[id];
  }

  removeWorker(id: string) {
    if (this.workers[id]) {
      this.workers[id].terminate();
      delete this.workers[id];
    }
  }

  getWorker(id: string): WebWorkerHandle | null {
    return this.workers[id] || null;
  }

  createWorker(
    taskName: string,
    workerUrl: string | URL = new URL("./webworkers/worker.ts", import.meta.url),
    options: WorkerOptions = {},
  ): WebWorkerHandle {
    const id = `worker-${Object.keys(this.workers).length + 1}`;

    if (!hasWorkerTask(taskName)) {
      throw new Error(`No worker task registered for "${taskName}". Add it in src/engine/webworkers/tasks.ts.`);
    }

    if (typeof Worker !== "undefined") {
      const worker = new Worker(workerUrl, {
        type: "module",
        ...options,
      });
      const handle = new WebWorkerHandle(id, worker, taskName);
      this.workers[id] = handle;
      return handle;
    }

    const toiler = new Toiler(taskName, options);
    const handle = new WebWorkerHandle(id, toiler, taskName);
    this.workers[id] = handle;
    return handle;
  }

  dispose() {
    for (const id in this.workers) {
      this.workers[id].terminate();
    }
    this.workers = {};
  }
}
