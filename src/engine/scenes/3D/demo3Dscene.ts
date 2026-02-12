import * as THREE from "three";
import { ThreeSceneBase } from "../../threescenebase";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { EntityFactory } from "../../entityfactory";
import { UpdateArgs, EntityState } from '../../core';

export class Demo3DScene extends ThreeSceneBase {
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

    const boxData: EntityState | any = {
      name: "GroundBox",
      entityType: "Box",
      userData: {
        width: 25,
        height: 1,
        depth: 25,
        material: {
          color: 0x888888,
          metalness: 0.25,
          roughness: 0.5,
        },
        physicsData: { 
          mass: 0,
          friction: 0.5,
          density: 1,
          restitution: 0.5 
        },
        transform: {
          position: new THREE.Vector3(0, -0.5, 0),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
        },
      },
    };
    EntityFactory.createAddEntities(this, [boxData]);

    for (let i = 0; i < 15; i++) {
      const boxData: EntityState | any = {
        name: `FallingBox${i}`,
        entityType: "RoundedBox",
        components: [
          {
            name: "ImpulseComponent",
            compType: "ImpulseComp",
            force: { fx: 0, fy: 1.5, fz: 0 },
            lifetime: 0.5,
          }
        ],
        userData: {
          radius: 0.075,
          segments: 5,
          width: 1,
          height: 1,
          depth: 1,
          material: {
            color: 0x008BFF,
            metalness: 0.25,
            roughness: 0.25,
          },
          physicsData: { 
            mass: 100, 
            friction: 0.5,
            density: 1,
            restitution: 0.001 
          },
          transform: {
            position: new THREE.Vector3((Math.random() - 0.5) * 2, 5 + i * 2, (Math.random() - 0.5) * 2),
            rotation: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(1, 1, 1),
          },
        },
      };
      EntityFactory.createAddEntities(this, [boxData]);
    }

    this.orbitControls = new OrbitControls(
      camera,
      phaserScene.game.canvas,
    ); // Needs to use the Phaser canvas instead of threeCanvas
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.15;
    this.orbitControls.rotateSpeed = 0.3;
    this.orbitControls.enableZoom = true;
    this.orbitControls.target.set(0, 0, 0);
    this.orbitControls.update();

    console.log("Demo3DScene initialized with a box entity.");

    this.getPostProcess()
      .addRenderPass()
      // .addRenderPixelatedPass(2)
      .addFXAAPass()
      .addPosterizePass(50, 1.2)
      .addOutputPass();

    // window.addEventListener("mousedown", (event) => {
    //   this.physics.addImpulseAtPoint(
    //     new THREE.Vector3(0, 1, 0), // Upward impulse
    //     new THREE.Vector3(0, 0, 0),
    //     35, // Strength of the impulse
    //     10 // Range of the impulse effect
    //   );
    // });

    // window.addEventListener("keydown", (event) => {
    //   if (event.code === "Space") {  
    //     saveSceneToFile(this, "demo3Dscene");
    //   }
    // });
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
