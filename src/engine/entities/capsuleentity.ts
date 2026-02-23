import * as THREE from "three";
import { EntityState, UpdateArgs } from "../shared";
import { EntityBase } from "../entitybase";
import { ThreeSceneBase } from "../threescenebase";
import { Entity } from "../entity";

/** A capsule entity */
export class CapsuleEntity extends EntityBase {
  constructor(threeScene: ThreeSceneBase, state: EntityState) {
    super(threeScene, state);
  }

  createObject3D(entityState: EntityState): THREE.Object3D {
    const transform = entityState.userData.transform!;
    const radius = entityState.userData.radius * transform.scale.x;
    const height = entityState.userData.height * transform.scale.y;
    entityState.userData.radius = radius;
    entityState.userData.height = height;
    transform.scale = new THREE.Vector3(1, 1, 1);
    const segments = entityState.userData.segments || 16;
    const materialData = entityState.userData.material || {};
    materialData.color = materialData.color ?? 0x00ff00;
    const geometry = new THREE.CapsuleGeometry(radius, height, segments, segments);
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