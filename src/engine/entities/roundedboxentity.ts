import * as THREE from "three";
import { EntityState, UpdateArgs, Transform } from '../core';
import { EntityBase } from "../entitybase";
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ThreeSceneBase } from "../threescenebase";


/** A box entity */
export class RoundedBoxEntity extends EntityBase {
  constructor(threeScene: ThreeSceneBase, state: EntityState) {
    super(threeScene, state);
  }
  
  createObject3D(entityState: EntityState): THREE.Object3D {
    const transform = entityState.userData.transform!;
    const width = entityState.userData.width * transform.scale.x;
    const height = entityState.userData.height * transform.scale.y;
    const depth = entityState.userData.depth * transform.scale.z;
    entityState.userData.width = width;
    entityState.userData.height = height;
    entityState.userData.depth = depth;
    transform.scale = new THREE.Vector3(1, 1, 1);
    const segments = entityState.userData.segments || 5;
    const radius = entityState.userData.radius || 0.075;
    const materialData = entityState.userData.material || {};
    materialData.color = materialData.color ?? 0x00ff00;
    const geometry = new RoundedBoxGeometry(width, height, depth, segments, radius);
    const material = new THREE.MeshStandardMaterial(materialData);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  onUpdate(args: UpdateArgs): void { }
  onDestroy(): void { }
}