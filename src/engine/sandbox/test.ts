
interface XYZ {
  x: number;
  y: number;
  z: number;
}

interface BufferConfig {
  buffer: number[];
  size: XYZ;
}

function createBuffer(size: XYZ): number[] {
  const buffer: number[] = [];
  for (let i = 0; i < size.x * size.y * size.z; i++) {
    buffer.push(Math.random());
  }
  return buffer;
}

function getValue(bufferConfig: BufferConfig, target: XYZ): number {
  const index = (target.y * bufferConfig.size.x + target.x) * bufferConfig.size.z + target.z;
  return bufferConfig.buffer[index];
}

function setValue(bufferConfig: BufferConfig, target: XYZ, value: number): void {
  const index = (target.y * bufferConfig.size.x + target.x) * bufferConfig.size.z + target.z;
  bufferConfig.buffer[index] = value;
}

function generateConfig(size: XYZ): BufferConfig {
  return {
    buffer: createBuffer(size),
    size,
  };
}

type ConfigModifier = (config: BufferConfig) => void;

function normalizeConfig(config: BufferConfig): void {
  const max = Math.max(...config.buffer);
  const min = Math.min(...config.buffer);
  const range = max - min;
  if (range === 0) {
    return;
  }
  for (let i = 0; i < config.buffer.length; i++) {
    config.buffer[i] = (config.buffer[i] - min) / range;
  }
}

function combineConfigs(config1: BufferConfig, config2: BufferConfig, modifier?: ConfigModifier): BufferConfig {
  if (config1.size.x !== config2.size.x || config1.size.y !== config2.size.y || config1.size.z !== config2.size.z) {
    throw new Error("Buffer sizes must match to combine.");
  }
  const combinedBuffer = config1.buffer.map((value, index) => value + config2.buffer[index]);
  const combinedConfig: BufferConfig = {
    buffer: combinedBuffer,
    size: config1.size,
  };
  if (modifier) {
    modifier(combinedConfig);
  }
  normalizeConfig(combinedConfig);
  return combinedConfig;
}

class BufferManager {
  private config: BufferConfig;

  constructor(size: XYZ) {
    this.config = generateConfig(size);
  }

  getConfig(): BufferConfig {
    return this.config;
  }

  getValue(target: XYZ): number {
    return getValue(this.config, target);
  }

  setValue(target: XYZ, value: number): void {
    setValue(this.config, target, value);
  }

  combineWith(other: BufferManager, modifier?: ConfigModifier): void {
    this.config = combineConfigs(this.config, other.getConfig(), modifier);
  }

  normalize(): void {
    normalizeConfig(this.config);
  }

  pushBuffer(x: number, y: number, value: number[]): void {
    if (x < 0 || x >= this.config.size.x || y < 0 || y >= this.config.size.y) {
      throw new Error("Coordinates out of bounds.");
    }else if (value.length > this.config.size.z) {
      throw new Error("Value length exceeds buffer depth.");
    }
    // Push values into the buffer at the specified (x, y) coordinates across all z layers
    for (let z = 0; z < this.config.size.z; z++) {
      const index = (y * this.config.size.x + x) * this.config.size.z + z;
      this.config.buffer[index] = value[z] || 0;
    }
  }
}

function convertWordToBinary(word: string): string {
  return word.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
}

function convertBinaryToWord(binary: string): string {
  return binary.match(/.{1,8}/g)?.map(byte => String.fromCharCode(parseInt(byte, 2))).join('') || '';
}

function createBufferFromWord(word: string): number[] {
  const binary = convertWordToBinary(word);
  const buffer: number[] = binary.split('').map(bit => parseInt(bit, 10));
  return buffer;
}

export function test() {
  // console.log("Test function executed");
  // const imgManager = new BufferManager({ x: 32, y: 32, z: 4 }); // 4 layers for RGBA
  // const imgBuffer = createBuffer( { x: 32, y: 32, z: 4 } );
  // imgManager.pushBuffer(0, 0, imgBuffer.slice(0, 128)); // Push first 128 values to (0,0)

  // const wordManager = new BufferManager({ x: 32, y: 32, z: 128 });
  // const wordBuffer = createBufferFromWord("Hello");
  // wordManager.pushBuffer(0, 0, wordBuffer);

  // const bOut = convertWordToBinary("Hello");
  // console.log(bOut);
  // console.log(convertBinaryToWord(bOut));
  // console.log(createBufferFromWord("Test"));
  // console.log(wordManager.getConfig());
}