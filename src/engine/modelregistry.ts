import * as THREE from "three";
import { loadGLTF } from "./utils";

const registry: Map<string, THREE.Object3D> = new Map();

export async function loadModel(name: string, ext: string): Promise<void> {
  if (registry.has(name)) {
    console.log(
      `Model with name ${name} already exists in registry. Overwriting.`,
    );
  }
  try {
    const model = await loadGLTF(name, ext);
    registry.set(name, model);
  } catch (error) {
    console.error(`Failed to load model ${name}:`, error);
  }
}

export function getModel(name: string): THREE.Object3D | undefined {
  const model = registry.get(name);
  if (!model) {
    console.warn(`Model with name ${name} not found in registry.`);
  }
  return model?.clone();
}

