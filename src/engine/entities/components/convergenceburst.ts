import * as THREE from "three";
import { Entity, EntityComponentState, UpdateArgs } from "../../core";
import { EntityComponentBase } from "../../entitycompbase";
import { disposeObject3D } from '../../utils';

/** A component that creates a burst of particles converging towards a target position */
export class ConvergenceBurstComponent extends EntityComponentBase {
  private amount: number = 10;
  private lifetime: number = 0.8;
  private speed: number = 10;
  private burstDuration: number = 0.2;
  private delayDuration: number = 0.12;
  private convergeStrength: number = 30;
  private convergeMaxSpeed: number = 28;
  private burstDrag: number = 1.5;
  private delayDrag: number = 8;

  private dummy: THREE.Object3D = new THREE.Object3D();
  private velocities: THREE.Vector3[] = [];
  private elapsedTime: number = 0;

  private instanceMesh?: THREE.InstancedMesh;
  private spawnPosition: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private baseOpacity: number = 1;
  private readonly tempVecA: THREE.Vector3 = new THREE.Vector3();
  private readonly tempVecB: THREE.Vector3 = new THREE.Vector3();

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
    const phaseSwitch1 = this.burstDuration;
    const phaseSwitch2 = this.burstDuration + this.delayDuration;
    const isBurstPhase = this.elapsedTime < phaseSwitch1;
    const isDelayPhase = this.elapsedTime >= phaseSwitch1 && this.elapsedTime < phaseSwitch2;

    for (let i = 0; i < this.amount; i++) {
      const velocity = this.velocities[i];
      this.instanceMesh.getMatrixAt(i, this.dummy.matrix);
      this.dummy.position.setFromMatrixPosition(this.dummy.matrix);

      if (isBurstPhase) {
        const drag = Math.max(0, 1 - this.burstDrag * deltaTime);
        velocity.multiplyScalar(drag);
      } else if (isDelayPhase) {
        const drag = Math.max(0, 1 - this.delayDrag * deltaTime);
        velocity.multiplyScalar(drag);
      } else {
        // const toTarget = this.tempVecA.subVectors(this.targetPosition, this.dummy.position);
        // const distance = toTarget.length();
        // if (distance > 1e-4) {
        //   const desiredSpeed = Math.min(this.convergeMaxSpeed, distance * this.convergeStrength);
        //   const desiredVelocity = toTarget.normalize().multiplyScalar(desiredSpeed);
        //   // Smoothly steer toward the target instead of snapping direction.
        //   velocity.lerp(desiredVelocity, Math.min(1, 12 * deltaTime));
        // }
      }

      this.dummy.position.addScaledVector(velocity, deltaTime);
      this.dummy.updateMatrix();
      this.instanceMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instanceMesh.instanceMatrix.needsUpdate = true;

    // Keep particles visible during burst/converge and fade near the tail.
    const material = this.instanceMesh.material as THREE.MeshStandardMaterial;
    const fadeStart = this.lifetime * 0.45;
    const fadeT = THREE.MathUtils.clamp((this.elapsedTime - fadeStart) / Math.max(1e-4, this.lifetime - fadeStart), 0, 1);
    material.opacity = this.baseOpacity * (1 - fadeT);

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
    const state = super.saveState();
    state.amount = this.amount;
    state.lifetime = this.lifetime;
    state.speed = this.speed;
    state.opacity = this.baseOpacity;
    state.targetPosition = this.targetPosition.clone();
    state.spawnPosition = this.spawnPosition.clone();
    state.burstDuration = this.burstDuration;
    state.delayDuration = this.delayDuration;
    state.convergeStrength = this.convergeStrength;
    state.convergeMaxSpeed = this.convergeMaxSpeed;
    return state;
  }

  loadState(state: EntityComponentState): void {
    const toSeconds = (value: number, fallback: number): number => {
      if (value === undefined || value === null) return fallback;
      // Backward compatibility for call sites passing milliseconds.
      return value > 10 ? value / 1000 : value;
    };

    this.amount = state.amount ?? this.amount;
    this.speed = state.speed ?? this.speed;
    this.baseOpacity = state.opacity ?? this.baseOpacity;
    this.lifetime = toSeconds(state.lifetime, this.lifetime);
    this.burstDuration = toSeconds(state.burstDuration, this.burstDuration);
    this.delayDuration = toSeconds(state.delayDuration, this.delayDuration);
    this.convergeStrength = state.convergeStrength ?? this.convergeStrength;
    this.convergeMaxSpeed = state.convergeMaxSpeed ?? this.convergeMaxSpeed;

    this.velocities.length = 0;
    this.elapsedTime = 0;

    for (let i = 0; i < this.amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 0.5;
      const radial = Math.sqrt(1 - y * y);
      const direction = new THREE.Vector3(
        Math.cos(angle) * radial,
        y + (Math.random() * 0.25 + 0.25), // Bias upwards
        Math.sin(angle) * radial,
      ).normalize();
      const burstSpeed = this.speed * (0.8 + Math.random() * 0.6);
      const velocity = direction.multiplyScalar(burstSpeed);
      this.velocities.push(velocity);
    }

    const geometry = new THREE.SphereGeometry(state.size || 0.15, 6, 6);
    const material = new THREE.MeshStandardMaterial({
      color: state.color || 0xffaa88,
      transparent: true,
      opacity: this.baseOpacity,
      depthWrite: false,
      emissive: state.color || 0xffaa88,
      emissiveIntensity: state.emissiveIntensity || 1,
      ...state.material,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, this.amount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instanceMesh = mesh;

    const entity = this.getEntity()!;
    const object3D = entity.getObject3D();

    // const spawnPointWorld = this.tempVecA.copy(entity.getTransform().position);
    const spawnPointWorld = this.tempVecA.copy(object3D.localToWorld(entity.getTransform().position));

    const targetPointWorld = this.tempVecB.copy(state.targetPosition);
    // const targetPointWorld = this.tempVecB.copy(object3D.localToWorld(state.targetPosition));

    this.spawnPosition.copy(spawnPointWorld);
    this.targetPosition.copy(targetPointWorld);

    for (let i = 0; i < this.amount; i++) {
      const angle = (i / this.amount) * Math.PI * 2;
      const radius = 0.05 + Math.random() * 0.35;
      const x = this.spawnPosition.x + Math.cos(angle) * radius;
      const y = this.spawnPosition.y + (Math.random() - 0.5) * radius;
      const z = this.spawnPosition.z + Math.sin(angle) * radius;
      this.dummy.position.set(x, y, z);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    }

    entity.attachObject3D(mesh);
  }
}
