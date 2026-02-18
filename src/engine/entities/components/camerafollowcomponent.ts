import * as THREE from "three";
import { Entity, EntityComponentState, UpdateArgs } from "../../core";
import { EntityComponentBase } from "../../entitycompbase";

/** A basic implementation of a camera follow component */
export class CameraFollowComponent extends EntityComponentBase {
  private _tempVec3: THREE.Vector3 = new THREE.Vector3();
  private followDistance: number = 5;

  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  private onMouseMove(event: any): void {
    const scene = this.getEntity()?.getThreeScene();
    const camera = scene?.getCamera();
    if (camera) {
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;
      camera.rotation.y -= movementX * 0.002;
      camera.rotation.x -= movementY * 0.002;
      camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -Math.PI / 2, Math.PI / 2);
    }
  }

  private onMouseClick(e: any): void {
    const baseScene = this.getEntity()?.getThreeScene()?.getPhaserScene();
    if (baseScene && !baseScene.input.mouse?.locked) {
      baseScene.input.mouse?.requestPointerLock();
    }
  }

  onUpdate(args: UpdateArgs): void { 
    const entity = this.getEntity();
    const scene = entity?.getThreeScene();
    const camera = scene?.getCamera();
    if (entity && camera) {
      entity.getObject3D().getWorldPosition(this._tempVec3);
      // camera.position.x = this._tempVec3.x;
      // camera.position.z = this._tempVec3.z + 5;
      // camera.position.y = this._tempVec3.y + 3;

      camera.position.set(
        this._tempVec3.x,
        this._tempVec3.y + 2,
        this._tempVec3.z + this.followDistance
      );
      // camera.lookAt(this._tempVec3);
    }
  }
  onDispose(): void { 
    const scene = this.getEntity()?.getThreeScene();
    const phaserScene = scene?.getPhaserScene();
    if (phaserScene) {
      phaserScene.input.off('pointermove', this.onMouseMove, this);
      phaserScene.input.off('pointerdown', this.onMouseClick, this);
    }
  }

  saveState(): EntityComponentState {
    return super.saveState();
  }

  loadState(state: EntityComponentState): void {
    const entity = this.getEntity();
    if (!entity) {
      throw new Error("CameraFollowComponent: No entity attached to component.");
    }
    const scene = entity.getThreeScene();
    const phaserScene = scene?.getPhaserScene();
     if (phaserScene) {
      phaserScene.input.on('pointermove', this.onMouseMove, this);
      phaserScene.input.on('pointerdown', this.onMouseClick, this);
    }
    if (scene) {
      const camera = scene.getCamera();
      camera.position.set(0, 2, this.followDistance);
      camera.rotation.order = 'YXZ';
    }
  }
}