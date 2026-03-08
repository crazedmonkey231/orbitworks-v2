import Phaser from "phaser";
import { Editor } from "../editor";
import { getDefaultFontStyle, getDefaultBackground } from "../editorutils";
import { XY } from "../../shared";
import { EntityDetailsPanel } from "./entitydetailspanel";
import { createDefaultDeleteButton } from "../deletebutton";


export class EntityBuilderPanel extends Phaser.GameObjects.Container {
  private size: XY = {
    x: window.innerWidth - 100,
    y: window.innerHeight - 125,
  };
  private buildArea: Phaser.GameObjects.Rectangle;
  private detailsPanel: EntityDetailsPanel;

  constructor(editor: Editor, x: number, y: number) {
    super(editor.getPhaserScene(), x, y);
    const bgd = getDefaultBackground(editor.getPhaserScene(), this.size);
    bgd.setInteractive();
    this.add(bgd);
    this.setSize(this.size.x, this.size.y);
    const title = editor
      .getPhaserScene()
      .add.text(10, 10, "Entity Builder", {
        ...getDefaultFontStyle(),
        fontSize: "18px",
      });
    this.add(title);
    // Additional UI elements for building entities would go here.

    this.detailsPanel = new EntityDetailsPanel(editor, this, 5, 35);
    this.add(this.detailsPanel);

    const padding = { top: 35, left: 300, right: 5, bottom: 5 };
    this.buildArea = editor
      .getPhaserScene()
      .add.rectangle(
        padding.left,
        padding.top,
        this.size.x - padding.left - padding.right,
        this.size.y - padding.top - padding.bottom,
        0x000000,
        0.5,
      );

    this.buildArea.setOrigin(0, 0);
    this.buildArea.setStrokeStyle(2, 0xffffff, 0.5);
    this.buildArea.setInteractive();
    this.add(this.buildArea);

    const closeButton = createDefaultDeleteButton({
      scene: editor.getPhaserScene(),
      x: this.size.x - 15,
      y: 15,
      width: 20,
      height: 20,
      onClick: () => {
        editor.queueSceneStateChange();
        editor.reloadScene(true);
        editor.removeEntityBuilder();
      },
    });
    this.add(closeButton);

    editor.getPhaserScene().tweens.add({
      targets: this,
      alpha: { from: 0, to: 1 },
      // scale: { from: 0.8, to: 1 },
      duration: 500,
      ease: "Power2",
    });
  }
}
