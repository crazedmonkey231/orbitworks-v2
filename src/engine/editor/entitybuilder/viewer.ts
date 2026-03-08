import { getDefaultBackground, getDefaultFontStyle } from "../editorutils";
import { ItemType, ScrollBox } from "../scrollbox";
import { EntityDetailsPanel } from "./entitydetailspanel";

function createViewerButton(scene: Phaser.Scene, x: number, y: number, width: number, height: number, text: string): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const bgd = scene.add.rectangle(0, 0, width, height, 0x555555, 0.8);
  bgd.setOrigin(0, 0);
  bgd.setStrokeStyle(1, 0xffffff, 0.8);
  bgd.setRounded(4);
  container.add(bgd);
  const buttonText = scene.add.text(width / 2, height / 2, text, {
    fontSize: "14px",
    color: "#ffffff",
  });
  buttonText.setOrigin(0.5);
  buttonText.setShadow(1, 1, "#000000", 2);
  container.add(buttonText);
  container.setSize(width, height);
  container.setInteractive({ 
    useHandCursor: true,
    hitArea: new Phaser.Geom.Rectangle(bgd.width / 2, bgd.height / 2, width, height),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains
   });
  container.on("pointerover", () => {
    bgd.setFillStyle(0x777777, 0.8);
  });
  container.on("pointerout", () => {
    bgd.setFillStyle(0x555555, 0.8);
  });
  return container;
}

export class Viewer extends Phaser.GameObjects.Container {
  detailsPanel: EntityDetailsPanel;
  scrollBox: ScrollBox;
  addItemButton: Phaser.GameObjects.Container;
  removeItemButton: Phaser.GameObjects.Container;

  constructor(panel: EntityDetailsPanel, x: number, y: number, width: number, height: number, titleText: string, onAddItem?: () => void, onRemoveItem?: () => void) {
    super(panel.scene, x, y);
    this.detailsPanel = panel;
    const bgd = getDefaultBackground(this.detailsPanel.scene, { x: width, y: height });
    bgd.setOrigin(0, 0);
    bgd.setStrokeStyle(2, 0xffffff, 0.5);
    this.add(bgd);
    const title = panel.scene.add.text(10, 6, titleText, {
      ...getDefaultFontStyle(),
      fontSize: "16px",
    });
    title.setShadow(1, 1, "#000000", 2);
    this.add(title);
    this.scrollBox = new ScrollBox(panel.scene, 5, 30, width - 10, height - 35);
    this.add(this.scrollBox);

    this.addItemButton = createViewerButton(panel.scene, width / 2, 6, 60, 18, "Add");
    this.add(this.addItemButton);
    this.addItemButton.on("pointerdown", () => {
      console.log("Add button clicked");
      // Implement add item logic here
      if (onAddItem) {
        onAddItem();
      }
    });
    this.removeItemButton = createViewerButton(panel.scene, width / 2 + 65, 6, 60, 18, "Remove");
    this.add(this.removeItemButton);
    this.removeItemButton.on("pointerdown", () => {
      console.log("Remove button clicked");
      // Implement remove item logic here
      if (onRemoveItem) {
        onRemoveItem();
      }
    });
  }
}