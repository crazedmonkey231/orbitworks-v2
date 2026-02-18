import * as THREE from "three";
import { ThreeSceneBase } from "../../threescenebase";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { UpdateArgs } from '../../core';

/** 
 * A scene that loads its state from a file. 
 * It includes basic camera setup, orbit controls, and a simple post-processing chain.
*/
export class GameThreeScene extends ThreeSceneBase {
  orbitControls?: OrbitControls;
  constructor(phaserScene: Phaser.Scene, filename: string, orbitControls: boolean, onLoaded?: (scene: ThreeSceneBase) => void) {
    const gameSceneOptions = {
      fov: 75,
      near: 0.1,
      far: 1000,
      physicsState: { enabled: false, helper: false },
    };
    super(phaserScene, gameSceneOptions);

    const enabled = orbitControls;
    if (enabled) {
      this.orbitControls = new OrbitControls(
        this.getCamera(),
        phaserScene.game.canvas,
      );

      this.orbitControls.enableDamping = true;
      this.orbitControls.dampingFactor = 0.15;
      this.orbitControls.rotateSpeed = 0.3;
      this.orbitControls.enableZoom = true;
      this.orbitControls.target.set(0, 0, 0);
      this.orbitControls.update();
    }

    this.getPostProcess()
      .addRenderPass()
      .addFXAAPass()
      // .addSSRPass()
      .addBloomPass(1.15, 0.25, 0.85)
      .addAfterImage(0.7)
      .addPosterizePass(80, 1.2)
      .addOutputPass();

    this.loadSceneFromFile(filename, () => {
      this.log(`Scene loaded from file: ${filename}`);
      if (onLoaded) {
        onLoaded(this);
      }
    }).catch((error) => {
      this.log(`Error loading scene from file: ${filename}`, error);
    });
  }

  onUpdate(args: UpdateArgs): void {
    // Additional update logic can go here
    this.orbitControls?.update();
  }

  onDispose(): void {
    // Clean up resources, event listeners, etc. specific to this scene
    this.orbitControls?.dispose();
  }
}
