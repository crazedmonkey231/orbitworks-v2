import * as THREE from "three";
import { Entity, EntityComponentState, UpdateArgs } from "../../core";
import { EntityComponentBase } from "../../entitycompbase";

/** A basic implementation of a point light component */
export class PointLightComponent extends EntityComponentBase {
  private light!: THREE.PointLight;
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  onUpdate(args: UpdateArgs): void { }

  onDispose(): void {
    if (this.light) {
      this.getEntity()?.detachObject3D(this.light);
      this.light.dispose();
      this.light = undefined as any;
    }
   }

  saveState(): EntityComponentState {
    const state = super.saveState();
    const newState: EntityComponentState = {
      ...state,
      color: this.light.color.getHex(),
      intensity: this.light.intensity,
      distance: this.light.distance,
    };
    return newState;
  }

  loadState(state: EntityComponentState): void {
    const entity = this.getEntity();
    if (!entity) {
      throw new Error("PointLightComponent: No entity attached to component.");
    }
    const color = state.color || 0xffffff;
    const intensity = state.intensity || 1;
    const distance = state.distance || 10;
    this.light = new THREE.PointLight(color, intensity, distance);
    this.light.castShadow = true;
    entity.attachObject3D(this.light);
  }
}