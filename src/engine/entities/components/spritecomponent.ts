import * as THREE from "three"
import { Entity, EntityComponentState, UpdateArgs } from "../../core";
import { EntityComponentBase } from "../../entitycompbase";
import { disposeObject3D, loadTexture } from "../../utils";

/** A basic implementation of an entity component */
export class SpriteComponent extends EntityComponentBase {
  textureName!: string;
  texture?: THREE.Texture;
  sprite?: THREE.Sprite;
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  setTexture() {
    loadTexture(this.textureName).then((value: THREE.Texture) => {
      value.colorSpace = THREE.SRGBColorSpace;
      this.texture = value;
      const mat = new THREE.SpriteMaterial({
        map: this.texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0,
        blendAlpha: THREE.NormalBlending,
        depthTest: true,
        depthWrite: true,
      });
      this.sprite = new THREE.Sprite(mat);
      this.sprite.scale.set(2, 2, 1);
      this.getEntity()?.attachObject3D(this.sprite);
    }).catch((err) => {
      console.error(`Failed to load texture ${this.textureName}:`, err);
    });
  }

  onUpdate(args: UpdateArgs): void { 
    // squish effect
    // if (this.sprite) {
    //   const scaleX = 1 + 0.25 * Math.sin(args.time / 3000 * Math.PI * 2);
    //   const scaleY = 1 - 0.05 * Math.sin(args.time / 3000 * Math.PI * 2);
    //   this.sprite.scale.set(2 * scaleX, 2 * scaleY, 1);
    // }
  }

  onDispose(): void {
    if (this.sprite) {
      this.getEntity()?.detachObject3D(this.sprite);
      if (this.sprite){
        disposeObject3D(this.sprite);
        this.sprite = undefined;
      }
      if (this.texture) {
        this.texture.dispose();
        this.texture = undefined;
      }
    }
  }

  saveState(): EntityComponentState {
    const save = super.saveState();
    return {
      ...save,
      textureName: this.textureName
    }
  }

  loadState(state: EntityComponentState): void {
    this.textureName = state.textureName || "sprite";
    this.setTexture();
  }
}