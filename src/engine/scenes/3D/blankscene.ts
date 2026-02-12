import { ThreeSceneBase } from "../../threescenebase";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { UpdateArgs } from '../../core';

/** 
 * A blank scene template to use as a starting point for new scenes or perfect for loading a saved scene state from a file. 
 * It includes basic camera setup, orbit controls, and a simple post-processing chain.
*/
export class BlankScene extends ThreeSceneBase {
  orbitControls: OrbitControls;
  constructor(phaserScene: Phaser.Scene) {
    const gameSceneOptions = {
      fov: 75,
      near: 0.1,
      far: 1000,
      physicsEnabled: true,
      physicsHelper: true,
    };
    super(phaserScene, gameSceneOptions);

    const camera = this.getCamera();
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    this.orbitControls = new OrbitControls(
      camera,
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
