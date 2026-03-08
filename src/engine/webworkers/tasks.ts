import { WebWorkerPayload, WebWorkerResponse } from "../shared";
import { registerWorkerTask } from "./task-registry";
import { CharacterPredictor } from "../sandbox/characterpredictor";

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

registerWorkerTask("generateText", async (payload: WebWorkerPayload): Promise<WebWorkerResponse> => {
  // console.log("Text generation task started with message:", payload.message);
  const predictor = new CharacterPredictor(payload.message, payload.seqLength);
  await predictor.train(payload.epochs, payload.batchSize);
  const generatedText = await predictor.predictNextChar(payload.seed, payload.seqLength, payload.temperature);
  console.log("Generated text:", generatedText);
  // predictor.downloadModel(); // Trigger model download after training and prediction
  // predictor.dispose();
  return { result: generatedText };
});
