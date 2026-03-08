import { XY } from "../shared";

export function getDefaultFontStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontSize: "16px",
    fontFamily: "Consolas, monospace",
    color: "#ffffff",
  };
}

export function getDefaultBackground(
  scene: Phaser.Scene,
  size: XY,
): Phaser.GameObjects.Rectangle {
  const bgd = scene.add.rectangle(0, 0, size.x, size.y, 0x000000, 0.25);
  bgd.setStrokeStyle(2, 0x000000, 0.25);
  // bgd.setRounded(2);
  bgd.setOrigin(0, 0);
  bgd.setScrollFactor(0);
  bgd.setDepth(0);
  bgd.setBlendMode(Phaser.BlendModes.NORMAL);
  return bgd;
}
