import { getDefaultFontStyle } from "../editorutils";
import { BuilderLink } from "./builderlink";
import { BuilderNode } from "./buildernode";
import { PortType, PortDirection } from "./types";

export interface BuilderPortConfig {
  node: BuilderNode;
  x: number;
  y: number;
  label: string;
  type: PortType;
  direction: PortDirection;
  color?: number;
  hoveredColor?: number;
}

export class BuilderPort extends Phaser.GameObjects.Container {
  node: BuilderNode;
  currentLink: BuilderLink | null = null;
  portType: PortType;
  portDirection: PortDirection;
  constructor(config: BuilderPortConfig) {
    super(config.node.scene, config.x, config.y);
    this.node = config.node;
    this.portType = config.type;
    this.portDirection = config.direction;
    const circle = config.node.scene.add.circle(0, 0, 5, config.color ?? 0xffffff);
    const text = config.node.scene.add.text(0, 15, config.label, getDefaultFontStyle());
    text.setOrigin(0.5);
    this.add(circle);
    this.add(text);

    this.setSize(10 + text.width, 10);
    this.setInteractive({
      cursor: "pointer",
      hitArea: new Phaser.Geom.Rectangle(0, 0, this.width, this.height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });

    this.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Handle port connection logic here
      if (this.currentLink) {
        this.clearPorts(this);
      }
      const tempPort = {
        x: pointer.worldX,
        y: pointer.worldY,
        getWorldPosition: () =>
          new Phaser.Math.Vector2(pointer.worldX, pointer.worldY),
      } as BuilderPort;
      this.currentLink = new BuilderLink(this.scene, this, tempPort);
      this.scene.add.existing(this.currentLink);
      console.log(`Started connecting from port: ${config.label}`);

      config.node.scene.input.on("pointermove", this.handlePointerMove, this);
      config.node.scene.input.on("pointerup", this.handlePointerUp, this);
    });

    this.on("pointerover", () => {
      circle.setFillStyle(config.hoveredColor ?? 0x00ff00);
    });

    this.on("pointerout", () => {
      circle.setFillStyle(config.color ?? 0xffffff);
    });
  }

  clearPorts(targetPort: BuilderPort) {
    if (targetPort.currentLink) {
      const existingLink = targetPort.currentLink;
      if (existingLink.inputPort) {
        existingLink.inputPort.currentLink = null;
      }
      if (existingLink.outputPort) {
        existingLink.outputPort.currentLink = null;
      }
      existingLink.destroy();
    }
  }

  getWorldPosition(): Phaser.Math.Vector2 {
    const matrix = this.getWorldTransformMatrix();
    return matrix.transformPoint(
      0,
      0,
      new Phaser.Math.Vector2(),
    ) as Phaser.Math.Vector2;
  }

  handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (this.currentLink) {
      const from = this.getWorldPosition();
      this.currentLink.setTo(from.x, from.y, pointer.worldX, pointer.worldY);
    }
  }

  handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (this.currentLink) {
      const targetPort = this.scene.input
        .hitTestPointer(pointer)
        .find((obj) => obj instanceof BuilderPort && obj !== this) as
        | BuilderPort
        | undefined;
      if (targetPort) {
        let canConnect = true;
        if (this.portDirection === targetPort.portDirection) {
          console.warn("Cannot connect ports with the same direction");
          canConnect = false;
        } else if (
          this.portType === PortType.Exec &&
          targetPort.portType === PortType.Data
        ) {
          console.warn("Cannot connect exec port to data port");
          canConnect = false;
        } else if (
          this.portType === PortType.Data &&
          targetPort.portType === PortType.Exec
        ) {
          console.warn("Cannot connect data port to exec port");
          canConnect = false;
        }

        if (canConnect) {
          if (targetPort.currentLink) {
            this.clearPorts(targetPort);
          }
          const from = this.getWorldPosition();
          const to = targetPort.getWorldPosition();
          this.currentLink.setTo(from.x, from.y, to.x, to.y);
          this.currentLink.outputPort = targetPort;
          targetPort.currentLink = this.currentLink;
        } else {
          this.clearPorts(this);
        }
      } else {
        this.clearPorts(this);
      }
    }

    this.scene.input.off("pointermove", this.handlePointerMove, this);
    this.scene.input.off("pointerup", this.handlePointerUp, this);
  }
}
