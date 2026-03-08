export interface DeleteButtonConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: string;
  cornerRadius?: number;
  onClick?: () => void;
}

export function createDefaultDeleteButton(config: DeleteButtonConfig): Phaser.GameObjects.Container {
  const { scene, x, y, width, height, fontSize, cornerRadius, onClick } = config;
  const container = scene.add.container(x, y);
  const bgd = scene.add.rectangle(0, 0, width, height, 0xff5555, 0.8);
  bgd.setOrigin(0.5);
  bgd.setStrokeStyle(1, 0xffffff, 0.8);
  bgd.setRounded(cornerRadius || 2);
  bgd.setScrollFactor(0);
  container.add(bgd);
  const buttonText = scene.add.text(0, 0, "X", {
    fontSize: fontSize || "14px",
    color: "#ffffff",
  });
  buttonText.setOrigin(0.5);
  buttonText.setShadow(1, 1, "#000000", 2);
  container.add(buttonText);
  container.setSize(width, height);
  container.setInteractive({ 
    useHandCursor: true,
    hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains
   });
  container.on("pointerover", () => {
    bgd.setFillStyle(0xffaaaa, 0.8);
  });
  container.on("pointerout", () => {
    bgd.setFillStyle(0xff5555, 0.8);
  });
  container.on("pointerdown", () => {
    if (onClick) {
      onClick();
    }
  });
  return container;
}