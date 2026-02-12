import { GameScene } from "../../core";
import { ThreeSceneBase } from "../../threescenebase";
import { Demo3DScene } from "../3D/demo3Dscene";
import { FileScene } from "../3D/filescene";
import { Editor } from "../../editor";
import { AudioComponent } from "../../entities/components/audiocomponent";
import { createComponent } from "../../entitycompfactory";

export class DemoPhaserScene extends Phaser.Scene {
  scene3D!: ThreeSceneBase;
  editor!: Editor;
  constructor() {
    super({ key: "DemoScene" });
  }

  preload() {
    // Load any Phaser assets if needed
  }

  async create() { 
    this.scene3D = new Demo3DScene(this);
    // this.scene3D = new FileScene(this, "my_scene", () => {
    //   this.scene3D.log("FileScene loaded and ready.");

    //   // Example of retrieving an object by name after the scene has loaded
    //   const obj = this.scene3D.findEntityByName("GroundBox");
    //   console.log("Retrieved object:", obj);

    //   this.scene3D.loadSounds(["button_hover", "button_click"]);

    //   this.input.on("pointerdown", () => {
    //     // this.scene3D.playSound3D("button_click", obj!.getObject3D());
    //     // createComponent<AudioComponent>(obj!, { name: "AudioComp1", compType: "AudioComp", audioKey: "button_click" }).playAudioOnce();
    //   });

    //   this.scene3D.setPaused(false);
    // });
    this.editor = new Editor(this, this.scene3D);

    // Example of using the web worker.
    // const worker = this.scene3D.createWebWorker("echo");

    // async example
    // const output = await this.scene3D.asyncRunWebWorkerTask(worker, { 
    //   message: "Hello from Phaser!"
    // });
    // console.log("Worker response:", output.result);

    // sync example
    // this.scene3D.runWebWorkerTask(worker, { 
    //   message: "Hello from Phaser!",
    //   data: { example: "This is additional data in the payload" } // Demonstrating flexibility of payload
    // }, (response) => {
    //   console.log("Worker response:", response.message, response.data);
    // });

    // Example of using the web worker to perform a heavy computation task. With a custom property in the payload to demonstrate flexibility.
    // const heavyWorker = this.scene3D.createWebWorker("heavyComputation");
    // const heavyOutput = await this.scene3D.asyncRunWebWorkerTask(heavyWorker, { 
    //   message: "Hello from Phaser heavy computation!",
    //   iterations: 1000000
    // });
    // console.log("Heavy computation result:", heavyOutput.result);
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.scene3D.update({ time: time, deltaTime: dt });
  }
}