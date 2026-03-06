import * as THREE from "three";
import { EntityComponentState, UpdateArgs } from "../../shared";
import { EntityComponentBase } from "../../entitycompbase";
import { Entity } from "../../entity";
import { getModel } from "../../registry";
import { disposeObject3D } from "../../utils";
import { mod } from "three/tsl";

/** A basic implementation of an entity component */
export class MeshComponent extends EntityComponentBase {
  private mesh: THREE.Mesh | null = null;
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  onUpdate(args: UpdateArgs): void {}
  onDispose(): void {
    if (this.mesh) {
      disposeObject3D(this.mesh);
      this.mesh = null;
    }
  }

  saveState(): EntityComponentState {
    const save = super.saveState();
    save.modelName = this.mesh ? this.mesh.name : undefined;
    save.offset = this.mesh
      ? {
          x: this.mesh.position.x,
          y: this.mesh.position.y,
          z: this.mesh.position.z,
        }
      : undefined;
    save.rotation = this.mesh
      ? {
          x: this.mesh.rotation.x,
          y: this.mesh.rotation.y,
          z: this.mesh.rotation.z,
        }
      : undefined;
    return save;
  }

  loadState(state: EntityComponentState): void {
    // No additional state to load for this basic component
    if (state.modelName) {
      const entity = this.getEntity();
      const model = getModel(state.modelName);
      if (model && entity) {
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const meshChild = child as THREE.Mesh;
            meshChild.castShadow = true;
            meshChild.receiveShadow = true;
          }
        });
        entity.attachObject3D(model);
        if (state.offset) {
          model.position.set(state.offset.x, state.offset.y, state.offset.z);
        }
        if (state.rotation) {
          model.rotation.set(
            state.rotation.x,
            state.rotation.y,
            state.rotation.z,
          );
        }
        this.mesh = model as THREE.Mesh;
        this.mesh.name = state.modelName; // Store model name for saving state
      } else {
        console.warn(
          `MeshComponent: Model "${state.modelName}" not found in registry.`,
        );
      }
    }
  }
}
