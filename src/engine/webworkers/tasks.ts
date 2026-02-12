import { WebWorkerPayload, WebWorkerResponse } from "../core";
import { registerWorkerTask } from "./task-registry";

// Example pass through task kept intentionally small.
registerWorkerTask("echo", (payload: WebWorkerPayload): WebWorkerResponse => ({ result: payload.message, ...payload }));

// Example of a more complex task that performs a heavy computation.
registerWorkerTask("heavyComputation", (payload: WebWorkerPayload): WebWorkerResponse => {
  console.log("Heavy computation task started with message:", payload.message);
  let count = 0;
  for (let i = 0; i < payload.iterations; i++) {
    count += Math.sqrt(i);
  }
  return { result: count };
});

