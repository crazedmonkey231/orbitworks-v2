import * as THREE from "three";
import { EntityComponentState, UpdateArgs } from "../../shared";
import { EntityComponentBase } from "../../entitycompbase";
import { disposeObject3D } from '../../utils';
import { Entity } from "../../entity";

/** A basic implementation of an entity component */
export class ParticleBurstComponent extends EntityComponentBase {
  private amount: number = 10;
  private lifetime: number = 0.5;
  private speed: number = 10;

  private dummy: THREE.Object3D = new THREE.Object3D();
  private velocities: THREE.Vector3[] = [];
  private gravity: THREE.Vector3 = new THREE.Vector3(0, 3, 0);
  private elapsedTime: number = 0;

  private instanceMesh?: THREE.InstancedMesh;
  private baseOpacity = 1;

  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  collide(otherEntity: Entity, started: boolean): void {
    // Default implementation does nothing, can be overridden by subclasses
  }
  
  onUpdate(args: UpdateArgs): void { 
    if (!this.getEntity() || !this.instanceMesh) return;
    const deltaTime = args.deltaTime;
    this.elapsedTime += deltaTime;
    for (let i = 0; i < this.amount; i++) {
      const velocity = this.velocities[i];
      this.instanceMesh.getMatrixAt(i, this.dummy.matrix);
      this.dummy.position.setFromMatrixPosition(this.dummy.matrix);
      velocity.add(this.gravity.clone().multiplyScalar(deltaTime));
      this.dummy.position.add(velocity.clone().multiplyScalar(deltaTime));
      this.dummy.updateMatrix();
      this.instanceMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instanceMesh.instanceMatrix.needsUpdate = true;

    // Fade out over time
    const material = this.instanceMesh.material as THREE.MeshStandardMaterial;
    material.opacity = this.baseOpacity * (1 - this.elapsedTime / this.lifetime);

    this.instanceMesh.scale.setScalar(this.elapsedTime * 1.75); // Particles grow over time

    if (this.elapsedTime >= this.lifetime) {
      this.removeFromEntity();
    }
  }

  onDispose(): void {
    if (this.instanceMesh) {
      disposeObject3D(this.instanceMesh);
    }
   }

  saveState(): EntityComponentState {
    return super.saveState();
  }

  loadState(state: EntityComponentState): void {
    this.speed = state.speed || 10
    this.baseOpacity = state.opacity || 1
    this.lifetime = state.lifetime || 500

    for (let i = 0; i < this.amount; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * this.speed * (Math.random() * 0.5 + 0.5),
        (Math.random() - 0.5) * this.speed * (Math.random() * 0.5 + 0.5),
        (Math.random() - 0.5) * this.speed * (Math.random() * 0.5 + 0.5),
      );
      this.velocities.push(velocity);
    }

    const geometry = new THREE.SphereGeometry(3, 6, 6);
    const material = new THREE.MeshStandardMaterial({
      color: state.color || 0xffffff,
      transparent: true,
      opacity: this.baseOpacity,
      emissive: state.color || 0xffffff,
      emissiveIntensity: state.emissiveIntensity || 3,
      ...state.material,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, this.amount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instanceMesh = mesh;
    this.getEntity()?.attachObject3D(mesh);
  }
}