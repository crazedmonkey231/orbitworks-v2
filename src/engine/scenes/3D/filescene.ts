import * as THREE from "three";
import { ThreeSceneBase } from "../../threescenebase";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { UpdateArgs } from '../../core';

/** 
 * A scene that loads its state from a file. 
 * It includes basic camera setup, orbit controls, and a simple post-processing chain.
*/
export class FileScene extends ThreeSceneBase {
  orbitControls: OrbitControls;
  constructor(phaserScene: Phaser.Scene, filename: string, onLoaded?: () => void) {
    const gameSceneOptions = {
      fov: 75,
      near: 0.1,
      far: 1000,
      physicsState: { enabled: false, helper: false },
    };
    super(phaserScene, gameSceneOptions);

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

    this.getPostProcess()
      .addRenderPass()
      .addFXAAPass()
      .addPosterizePass(50, 1.2)
      .addOutputPass();

    this.loadSceneFromFile(filename, onLoaded).catch((error) => {
      this.log(`Error loading scene from file: ${filename}`, error);
    });
  }

  onUpdate(args: UpdateArgs): void {
    // Additional update logic can go here
    this.orbitControls.update();
  }

  onDispose(): void {
    // Clean up resources, event listeners, etc. specific to this scene
    this.orbitControls.dispose();
  }
}
