import * as THREE from "three";
import { EntityComponentState, Transform, UpdateArgs } from "../../shared";
import { EntityComponentBase } from "../../entitycompbase";
import { Entity } from "../../entity";

/** A basic implementation of a camera component */
export class CameraComponent extends EntityComponentBase {
  private camera: THREE.PerspectiveCamera;

  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.loadState(state);
    entity.attachObject3D(this.camera);
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  onUpdate(args: UpdateArgs): void { }

  onDispose(): void { 
    const entity = this.getEntity();
    if (this.camera && entity) {
      entity.detachObject3D(this.camera);
      this.camera = null!;
    }
  }

  saveState(): EntityComponentState {
    const save = super.saveState();
    save.cameraSettings = {
      fov: this.camera.fov,
      aspect: this.camera.aspect,
      near: this.camera.near,
      far: this.camera.far,
      transform: {
        quaternion: this.camera.quaternion.toArray(),
        position: this.camera.position.toArray(),
        rotation: this.camera.rotation.toArray(),
        scale: this.camera.scale.toArray(),
      }
    };
    return save;
  }

  loadState(state: EntityComponentState): void { 
    if (state.cameraSettings) {
      const { fov, aspect, near, far } = state.cameraSettings;
      this.camera.fov = fov || this.camera.fov;
      this.camera.aspect = aspect || this.camera.aspect;
      this.camera.near = near || this.camera.near;
      this.camera.far = far || this.camera.far;
      this.camera.quaternion.fromArray(state.cameraSettings.transform.quaternion);
      this.camera.position.fromArray(state.cameraSettings.transform.position);
      this.camera.rotation.fromArray(state.cameraSettings.transform.rotation);
      this.camera.scale.fromArray(state.cameraSettings.transform.scale);
      this.camera.updateProjectionMatrix();
    }
  }
}