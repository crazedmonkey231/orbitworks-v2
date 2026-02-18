import * as THREE from "three"
import { Entity, EntityComponentState, UpdateArgs } from "../../core";
import { EntityComponentBase } from "../../entitycompbase";
import { disposeObject3D, loadTexture } from "../../utils";

/** A basic implementation of an entity component */
export class AnimatedSpriteComponent extends EntityComponentBase {
  private textureNames: string[] = [];
  private textures: THREE.Texture[] = [];
  private sprite!: THREE.Sprite;

  private animSpeed: number = 0.25;
  private currentFrame: number = 0;
  private elapsedTime: number = 0;

  private animationRange: [number, number] = [1, 1];

  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  isSameRange(start: number, end: number): boolean {
    return this.animationRange[0] === start && this.animationRange[1] === end;
  }

  setAnimationRange(start: number, end: number) {
    this.animationRange = [start, end];
    // this.currentFrame = start;
  }

  setAnimationSpeed(newSpeed: number) {
    this.animSpeed = newSpeed
  }

  setTexture() {
    this.textureNames.forEach((name, index) => {
      loadTexture(name).then((value: THREE.Texture) => {
        value.colorSpace = THREE.SRGBColorSpace;
        this.textures[index] = value;
        if (index === 0) {
          const mat = new THREE.SpriteMaterial({
            map: this.textures[0],
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
        }
      }).catch((err) => {
        console.error(`Failed to load texture ${name}:`, err);
      });
    });
  }

  onUpdate(args: UpdateArgs): void { 
    if (this.textures.length === 0) return;
    this.elapsedTime += args.deltaTime;
    if (this.elapsedTime >= this.animSpeed) {
      this.elapsedTime = 0;
      this.currentFrame = (this.currentFrame + 1) % (this.animationRange[1] - this.animationRange[0] + 1) + this.animationRange[0];
      const material = this.sprite.material as THREE.SpriteMaterial;
      material.map = this.textures[this.currentFrame];
      material.needsUpdate = true;
    }
  }

  onDispose(): void {
    if (this.sprite) {
      disposeObject3D(this.sprite);
    }
    this.sprite = null as any;
    this.textures.forEach((texture) => {
      texture.dispose();
    });
    this.textures = [];
  }

  saveState(): EntityComponentState {
    const save = super.saveState();
    return {
      ...save,
      textureNames: this.textureNames
    }
  }

  loadState(state: EntityComponentState): void {
    this.textureNames = state.textureNames || [];
    this.setTexture();
  }
}