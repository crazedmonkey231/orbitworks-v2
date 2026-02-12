import * as THREE from "three";
import { GLTFLoader, ImprovedNoise } from "three/examples/jsm/Addons.js";
import { ModelPath, TexturePath } from "./paths";

/** Handy tween easing reference */
export const tweensEasing = {
  linear: "Linear",
  sineEaseInOut: "Sine.easeInOut",
  expoEaseInOut: "Expo.easeInOut",
  circEaseInOut: "Circ.easeInOut",
  quadEaseInOut: "Quad.easeInOut",
  cubicEaseInOut: "Cubic.easeInOut",
  quartEaseInOut: "Quart.easeInOut",
  quintEaseInOut: "Quint.easeInOut",
  backEaseInOut: "Back.easeInOut",
  elasticEaseInOut: "Elastic.easeInOut",
  bounceEaseInOut: "Bounce.easeInOut",
};

/** Utility function to dispose of a THREE.Mesh and its resources */
export function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((mat) => mat.dispose());
  } else {
    mesh.material.dispose();
  }
}

/** Utility function to dispose of a THREE.Object3D and its children */
export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      disposeMesh(child as THREE.Mesh);
    }
  });
}

/** Utility function to get the caret index in an input field based on a Phaser pointer event */
export function getCaretIndexFromPointer(
  inputElement: HTMLInputElement,
  pointer: Phaser.Input.Pointer,
): number {
  const nativeEvent = pointer.event as MouseEvent | TouchEvent | undefined;
  let clientX: number | null = null;

  if (nativeEvent instanceof MouseEvent) {
    clientX = nativeEvent.clientX;
  } else if (
    nativeEvent instanceof TouchEvent &&
    nativeEvent.changedTouches.length > 0
  ) {
    clientX = nativeEvent.changedTouches[0].clientX;
  }

  const text = inputElement.value;
  if (clientX === null) {
    return text.length;
  }

  const rect = inputElement.getBoundingClientRect();
  const style = window.getComputedStyle(inputElement);
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(style.paddingRight) || 0;
  const innerLeft = rect.left + paddingLeft;
  const innerRight = rect.right - paddingRight;
  const clampedX = Math.min(Math.max(clientX, innerLeft), innerRight);
  const targetTextX = clampedX - innerLeft + inputElement.scrollLeft;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Math.floor(
      ((clampedX - innerLeft) / Math.max(innerRight - innerLeft, 1)) *
        text.length,
    );
  }

  ctx.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const width = ctx.measureText(text.slice(0, mid)).width;
    if (width < targetTextX) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const prevIndex = Math.max(0, low - 1);
  const prevWidth = ctx.measureText(text.slice(0, prevIndex)).width;
  const currWidth = ctx.measureText(text.slice(0, low)).width;
  return Math.abs(targetTextX - prevWidth) <= Math.abs(currWidth - targetTextX)
    ? prevIndex
    : low;
}

// three.js models
const gltfLoader = new GLTFLoader();
/** Load a GLTF model from models folder */
export function loadGLTF(path: string): Promise<THREE.Object3D> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      ModelPath(path),
      (gltf) => {
        const child = gltf.scene.children[0];
        child.traverse((node: any) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        resolve(child);
      },
      undefined,
      reject
    );
  });
}

// load a texture
const textureLoader = new THREE.TextureLoader();
/** Load a texture from textures folder */
export function loadTexture(path: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      TexturePath(path),
      (texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        resolve(texture);
      },
      undefined,
      reject
    );
  });
}

/** Perlin noise height generation */
export function generateNoise(
  x: number,
  z: number,
  seed: number,
  heightOffset: number = 0,
  frequency: number = 100,
  amplitude: number = 50,
  scaleX: number = 10,
  scaleZ: number = 10,
  strength: number = 0.3,
  noiseClass: any = null
): number {
  const ImprovedNoiseClass = noiseClass || ImprovedNoise;
  const noise = new ImprovedNoiseClass();
  const generateHeightVariation = (): number => {
    return (
      (noise.noise(x / frequency, z / frequency, seed) + 1) * strength * scaleZ
    );
  };
  const height =
    heightOffset +
    (noise.noise(x / amplitude, z / amplitude, seed) + 1) *
    generateHeightVariation() *
    scaleX;
  return Math.floor(height);
}

/** Get a unique key for a vector3 */
export function getKey(vector: THREE.Vector3): string {
  return `${vector.x},${vector.y},${vector.z}`;
}

/** Get chunk position from world position */
export function getChunkPosition(
  position: THREE.Vector3,
  chunkSize: number,
  outVector?: THREE.Vector3
): THREE.Vector3 {
  const cx = Math.floor(position.x / chunkSize);
  const cy = Math.floor(position.y / chunkSize);
  const cz = Math.floor(position.z / chunkSize);
  // return new THREE.Vector3(cx * chunkSize, cy * chunkSize, cz * chunkSize);
  if (outVector) {
    outVector.set(cx * chunkSize, cy * chunkSize, cz * chunkSize);
    return outVector;
  }
  return new THREE.Vector3(cx * chunkSize, cy * chunkSize, cz * chunkSize);
}

/** Get chunk key from chunk position */
export function getChunkKey(chunkPos: THREE.Vector3, chunkSize: number): string {
  return getKey(getChunkPosition(chunkPos, chunkSize));
}