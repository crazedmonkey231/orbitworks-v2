import * as THREE from "three";
import { EntityState, UpdateArgs } from '../types';
import { EntityBase } from "../entitybase";
import { ThreeSceneBase } from "../threescenebase";
import { Entity } from "../entity";


/** 
 * A box entity.
 * Entities must apply the transforms for physics to work properly.
 */
export class BoxEntity extends EntityBase {
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
    const materialData = entityState.userData.material || {};
    materialData.color = materialData.color ?? 0x00ff00;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial(materialData);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  
  onCollide(otherEntity: Entity, started: boolean): void { }
  onUpdate(args: UpdateArgs): void { }
  onDestroy(): void { }
}