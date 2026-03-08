import Phaser from "phaser";
import { Editor } from "./editor";
import { getDefaultFontStyle, getDefaultBackground } from "./editorutils";
import { XY } from "../shared";

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

    this.bgd = getDefaultBackground(scene, size);
    this.bgd.setOrigin(0, 0);
    this.bgd.setInteractive({ useHandCursor: true });
    this.bgd.on("pointerover", () => this.bgd.setFillStyle(0xffffff, 0.25));
    this.bgd.on("pointerout", () => this.bgd.setFillStyle(0x000000, 0.25));
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
  }
}

export class ToolBar extends Phaser.GameObjects.Container {
  constructor(
    editor: Editor,
    x: number,
    y: number
  ) {
    super(editor.getPhaserScene(), x, y);
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
      {
        label: "Entity Builder",
        action: () => {
          editor.toggleEntityBuilder();
        },
      },
      { label: "Deselect", action: () => editor.deselectObject() },
      { label: "Inspect", action: () => editor.inspectSelected() },
    ];
    // const width = window.innerWidth / buttonData.length;
    const width = 150;
    let currentX = 0;
    buttonData.forEach((btn) => {
      const button = new ToolBarButton(
        phaserScene,
        { x: currentX + 5, y: 5 },
        btn.label,
        { x: width, y: 30 },
        btn.action,
      );
      hudContainer.add(button);
      currentX += width + 5;
    });

    this.setSize(currentX, 40);
  }

  getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x, this.y, this.width, this.height);
  }
}
