import * as THREE from "three";
import { EntityComponentState, UpdateArgs } from "../../shared";
import { EntityComponentBase } from "../../entitycompbase";
import { Entity } from "../../entity";

/** A basic implementation of a spot light component */
export class SpotLightComponent extends EntityComponentBase {
  private light!: THREE.SpotLight;
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  getLight(): THREE.SpotLight {
    return this.light;
  }

  setLight(light: THREE.SpotLight) {
    this.light = light;
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
      height: this.light.position.y,
    };
    return newState;
  }

  loadState(state: EntityComponentState): void {
    const entity = this.getEntity();
    if (!entity) {
      throw new Error("SpotLightComponent: No entity attached to component.");
    }
    
    const color = state.color || 0xfff8e7; // Default to soft white light
    const intensity = state.intensity || 50;
    const height = state.height || 5;
    const shadowMapSize = state.shadowMapSize || 1024;
    const far = state.far || 50;
    this.light = new THREE.SpotLight(color, intensity, 100, Math.PI / 4, 0.5, 1);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    this.light.shadow.camera.near = 0.5;
    this.light.shadow.camera.far = far;
    this.light.shadow.camera.updateProjectionMatrix();
    this.light.position.set(0, height, 0); 
    this.light.target = entity.getObject3D();
    this.light.target.updateMatrixWorld();
    entity.attachObject3D(this.light);

    // Decor light cone for visualization
    // const coneGeometry = new THREE.ConeGeometry(Math.tan(this.light.angle) * far, far, 32, 1, true);
    // const coneMaterial = new THREE.MeshBasicMaterial({ color: color, wireframe: false, opacity: 0.25, transparent: true });
    // const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
    // coneMesh.position.set(0, -far / 2, 0);
    // this.light.add(coneMesh);
  }
}