import Phaser from "phaser";
import { Editor } from "./editor";
import { getDefaultFontStyle, createEditableProperty } from "./editorutils";
import { XY } from "../shared";

interface ToolBarConfig {
  onChange?: (propertyName: string, newValue: any) => void;
  onEnter?: (propertyName: string) => void;
}

class ToolBarButton extends Phaser.GameObjects.Container {
  private text: Phaser.GameObjects.Text;
  private bgd: Phaser.GameObjects.Rectangle;
  private action: () => void;
  constructor(
    scene: Phaser.Scene,
    position: XY,
    label: string,
    size: XY,
    action: () => void,
  ) {
    super(scene, position.x, position.y);
    this.action = action;

    this.bgd = scene.add.rectangle(0, 0, size.x, size.y, 0x555555);
    this.bgd.setOrigin(0, 0);
    this.bgd.setStrokeStyle(2, 0x222222);
    this.bgd.setData(
      "bounds",
      new Phaser.Geom.Rectangle(this.x, this.y, size.x, size.y),
    );
    this.bgd.setInteractive({ useHandCursor: true });
    this.bgd.on("pointerover", () => this.bgd.setFillStyle(0x777777));
    this.bgd.on("pointerout", () => this.bgd.setFillStyle(0x555555));
    this.bgd.on("pointerdown", () => this.action());
    this.add(this.bgd);

    const centerX = size.x / 2;
    const centerY = size.y / 2;

    this.text = scene.add.text(centerX, centerY, label, {
      ...getDefaultFontStyle(),
    });
    this.text.setOrigin(0.5, 0.5);

    this.add(this.text);
    this.setSize(size.x, size.y);
    this.setData("bounds", this.getBounds());
  }
}

export class ToolBar extends Phaser.GameObjects.Container {
  private editor: Editor;
  private config: ToolBarConfig;
  constructor(
    editor: Editor,
    x: number,
    y: number,
    config: ToolBarConfig = {},
  ) {
    super(editor.getPhaserScene(), x, y);
    this.config = config;
    this.editor = editor;
    this.create();
  }

  getBounds(): Phaser.Geom.Rectangle {
    // Override to provide bounds for the container based on its children
    const childrenBounds = this.getAll()
      .map((child) => child.getData("bounds") as Phaser.Geom.Rectangle)
      .filter((b) => b !== undefined);
    if (childrenBounds.length === 0) {
      return new Phaser.Geom.Rectangle(this.x, this.y, 0, 0);
    }
    const minX = Math.min(...childrenBounds.map((b) => b.x));
    const minY = Math.min(...childrenBounds.map((b) => b.y));
    const maxX = Math.max(...childrenBounds.map((b) => b.x + b.width));
    const maxY = Math.max(...childrenBounds.map((b) => b.y + b.height));
    return new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  create(): void {
    const editor = this.editor;
    const phaserScene = editor.getPhaserScene();
    const hudContainer = editor.getHudContainer();
    const buttonData = [
      {
        label: "Scene Properties",
        action: () => editor.toggleScenePropertiesPanel(),
      },
      {
        label: "Add Entity",
        action: () => {
          editor.toggleEntityPicker();
        },
      },
      { label: "Deselect", action: () => editor.deselectObject() },
    ];
    const width = window.innerWidth / buttonData.length;
    let currentX = 0;
    buttonData.forEach((btn) => {
      const button = new ToolBarButton(
        phaserScene,
        { x: currentX, y: 0 },
        btn.label,
        { x: width, y: 30 },
        btn.action,
      );
      hudContainer.add(button);
      currentX += width;
    });
  }
}
