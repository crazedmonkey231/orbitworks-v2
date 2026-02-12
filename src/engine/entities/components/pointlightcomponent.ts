import * as THREE from "three";
import { Entity, EntityComponentState, UpdateArgs } from "../../core";
import { EntityComponentBase } from "../../entitycompbase";

/** A basic implementation of a point light component */
export class PointLightComponent extends EntityComponentBase {
  private light!: THREE.PointLight;
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    const color = state.color || 0xffffff;
    const intensity = state.intensity || 1;
    const distance = state.distance || 100;
    this.light = new THREE.PointLight(color, intensity, distance);
    this.light.castShadow = true;
    entity.attachObject3D(this.light);
  }

  onUpdate(args: UpdateArgs): void { }

  onDispose(): void {
    this.getEntity()?.detachObject3D(this.light);
    this.light.dispose();
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
    super.loadState(state);
    this.light.color.setHex(state.color || 0xffffff);
    this.light.intensity = state.intensity || 1;
    this.light.distance = state.distance || 100;
  }
}