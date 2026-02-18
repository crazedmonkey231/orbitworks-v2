import * as THREE from "three";
import { EntityComponentState, UpdateArgs } from "../../types";
import { EntityComponentBase } from "../../entitycompbase";
import { Entity } from "../../entity";

/** A basic impulse component */
export class ImpulseComponent extends EntityComponentBase {
  private force: THREE.Vector3 = new THREE.Vector3();
  private timeAccumulator: number = 0;
  private lifetime: number = 1;
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  onUpdate(args: UpdateArgs): void {
    const entity = this.getEntity();
    const object3D = entity?.getObject3D();
    const mesh = object3D as THREE.Mesh;
    const name = this.getName();
    if (!mesh){
      entity?.removeComponent(name);
      return;
    }
    entity?.getThreeScene()?.addImpulse(entity, this.force, 1);
    if (this.lifetime === -1) return;
    this.timeAccumulator += args.deltaTime;
    if (this.timeAccumulator >= this.lifetime) {
      entity?.removeComponent(name);
    }
  }

  onDispose(): void {
    // No special disposal needed for this component
  }

  saveState(): EntityComponentState {
    const baseState = super.saveState();
    return {
      ...baseState,
      force: { fx: this.force.x, fy: this.force.y, fz: this.force.z },
      lifetime: this.lifetime,
    };
  }

  loadState(state: EntityComponentState): void {
    const {fx, fy, fz} = state.force as any;
    this.force.set(fx, fy, fz);
    this.lifetime = state.lifetime || this.lifetime;
  }
}