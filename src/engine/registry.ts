import * as THREE from "three";
import { loadGLTF, loadTexture } from "./utils";

const modelRegistry: Map<string, THREE.Object3D> = new Map();
const textureRegistry: Map<string, THREE.Texture> = new Map();

export async function importModel(name: string, ext: string=".glb"): Promise<void> {
  if (modelRegistry.has(name)) {
    console.log(
      `Model with name ${name} already exists in registry. Overwriting.`,
    );
  }
  try {
    const model = await loadGLTF(name, ext);
    modelRegistry.set(name, model);
  } catch (error) {
    console.error(`Failed to load model ${name}:`, error);
  }
}

export function getModel(name: string): THREE.Object3D | undefined {
  const model = modelRegistry.get(name);
  if (!model) {
    console.warn(`Model with name ${name} not found in registry.`);
  }
  return model?.clone();
}

export async function importTexture(name: string, ext: string = ".png"): Promise<void> {
  if (textureRegistry.has(name)) {
    console.log(
      `Texture with name ${name} already exists in registry. Overwriting.`,
    );
  }
  try {
    const texture = await loadTexture(name, ext);
    textureRegistry.set(name, texture);
  } catch (error) {
    console.error(`Failed to load texture ${name}:`, error);
  }
}

export function registerTexture(name: string, texture: THREE.Texture): void {
  if (textureRegistry.has(name)) {
    console.log(
      `Texture with name ${name} already exists in registry. Overwriting.`,
    );
  }
  textureRegistry.set(name, texture);
}

export function getTexture(name: string): THREE.Texture | undefined {
  const texture = textureRegistry.get(name);
  if (!texture) {
    console.warn(`Texture with name ${name} not found in registry.`);
  }
  return texture;
}