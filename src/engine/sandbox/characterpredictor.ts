import * as tf from "@tensorflow/tfjs";

export class CharacterPredictor {
  private model: tf.LayersModel | null = null;
  private charToIdx: Map<string, number>;
  private idxToChar: string[];
  private encoded: number[];
  private seqLength: number;
  private xTensor: tf.Tensor2D;
  private yTensor: tf.Tensor;

  constructor(text: string, seqLength: number) {
    const chars = Array.from(new Set(text)).sort();
    this.charToIdx = new Map(chars.map((ch, i) => [ch, i]));
    this.idxToChar = chars;
    const vocabSize = chars.length;
    this.seqLength = seqLength;

    console.log("Vocabulary:", chars.join(""));
    console.log("Vocab size:", vocabSize);

    this.encoded = Array.from(text).map((ch) => this.charToIdx.get(ch) || 0);

    const xs = [];
    const ys = [];

    for (let i = 0; i < this.encoded.length - this.seqLength; i++) {
      const inputSeq: any = this.encoded.slice(i, i + this.seqLength);
      const targetChar: any = this.encoded[i + this.seqLength];
      xs.push(inputSeq);
      ys.push(targetChar);
    }

    const numSamples = xs.length;
    console.log("Samples:", numSamples);

    this.xTensor = tf.tensor2d(xs, [numSamples, this.seqLength], "int32");
    this.yTensor = tf.oneHot(tf.tensor1d(ys, "int32"), vocabSize);

    const model = tf.sequential();
    model.add(
      tf.layers.embedding({
        inputDim: vocabSize,
        outputDim: 16,
        inputLength: this.seqLength,
      }),
    );
    model.add(tf.layers.gru({ units: 64 }));
    model.add(tf.layers.dense({ units: vocabSize, activation: "softmax" }));
    model.compile({
      loss: "categoricalCrossentropy",
      optimizer: tf.train.adam(0.01),
      metrics: ["accuracy"],
    });
    this.model = model;
  }

  async train(epochs: number = 40, batchSize: number = 32) {
    if (!this.model) {
      throw new Error("Model is not initialized.");
    }
    await this.model.fit(this.xTensor, this.yTensor, {
      epochs: epochs,
      batchSize: batchSize,
      shuffle: true,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          console.log(
            `Epoch ${epoch + 1}: loss=${logs?.loss?.toFixed(4)}, acc=${logs?.acc?.toFixed?.(4) ?? logs?.accuracy?.toFixed?.(4)}`,
          );
        },
      },
    });
  }

  async predictNextChar(
    seed: string,
    length = 100,
    temperature: number = 0.8,
  ): Promise<string> {
    if (!this.model) {
      throw new Error("Model is not trained yet.");
    }
    let result = seed.toLowerCase();

    for (let i = 0; i < length; i++) {
      const seedSlice = result.slice(-this.seqLength).padStart(this.seqLength, " ");
      const inputIds: any = Array.from(seedSlice).map((ch) =>
        this.charToIdx.has(ch) ? this.charToIdx.get(ch) : (this.charToIdx.get(" ") ?? 0),
      );

      const inputTensor = tf.tensor2d([inputIds], [1, this.seqLength], "int32");

      const prediction: any = tf.tidy(() => {
        const logits: any = this.model!.predict(inputTensor);

        // Convert probabilities to temperature-adjusted distribution
        const logProbs = tf.log(logits);
        const scaled = tf.div(logProbs, tf.scalar(temperature));
        const probs = tf.softmax(scaled);

        return probs;
      });

      const sampled = await tf.multinomial(prediction, 1).data();
      const nextIdx = sampled[0];
      const nextChar = this.idxToChar[nextIdx];

      result += nextChar;

      inputTensor.dispose();
      prediction.dispose();
    }

    return result;
  }

  downloadModel() {
    if (!this.model) {
      throw new Error("Model is not trained yet.");
    }
    this.model.save("downloads://character-predictor-model");
  }

  dispose() {
    this.xTensor.dispose();
    this.yTensor.dispose();
    if (this.model) {
      this.model.dispose();
    }
  }
}

export async function createCharacterPredictor(data: any) {
  const predictor = new CharacterPredictor(data.message, data.seqLength);
  await predictor.train(data.epochs, data.batchSize);
  const generatedText = await predictor.predictNextChar(data.seed, data.seqLength, data.temperature);
  predictor.downloadModel();
  predictor.dispose();
  return generatedText;
}
