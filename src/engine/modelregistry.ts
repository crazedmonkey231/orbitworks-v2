import * as THREE from "three";
import { loadGLTF } from "./utils";

export class ModelRegistry {
  private static registry: Map<string, THREE.Object3D> = new Map();

  static async loadModel(name: string, ext: string): Promise<void> {
    if (this.registry.has(name)) {
      console.log(
        `Model with name ${name} already exists in registry. Overwriting.`,
      );
    }
    try {
      const model = await loadGLTF(name, ext);
      this.registry.set(name, model);
    } catch (error) {
      console.error(`Failed to load model ${name}:`, error);
    }
  }

  static getModel(name: string): THREE.Object3D | undefined {
    const model = this.registry.get(name);
    if (!model) {
      console.warn(`Model with name ${name} not found in registry.`);
    }
    return model?.clone();
  }
}
