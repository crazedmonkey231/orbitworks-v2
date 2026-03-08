import { BuilderPort } from "./builderport";


export class BuilderLink extends Phaser.GameObjects.Line {
  inputPort: BuilderPort;
  outputPort: BuilderPort;
  updateHandler: any;
  constructor(scene: Phaser.Scene, inputPort: BuilderPort, outputPort: BuilderPort) {
    const from = inputPort.getWorldPosition();
    const to = outputPort.getWorldPosition();
    super(scene, 0, 0, from.x, from.y, to.x, to.y, 0xffffff, 1);
    this.inputPort = inputPort;
    this.outputPort = outputPort;
    this.setLineWidth(3);
    this.setOrigin(0, 0);
    this.updateHandler = this.update.bind(this);
    scene.events.on("update", this.updateHandler);
  }

  destroy(fromScene?: boolean): void {
    this.scene.events.off("update", this.updateHandler);
    super.destroy(fromScene);
  }

  update(...args: any[]): void {
    const from = this.inputPort.getWorldPosition();
    const to = this.outputPort.getWorldPosition();
    this.setTo(from.x, from.y, to.x, to.y);
  }
}