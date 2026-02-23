import { XY } from "../shared";
import { getCaretIndexFromPointer } from "../utils";

export interface EditableProperty {
  phaserScene?: Phaser.Scene;
  container?: Phaser.GameObjects.Container;
  name: string;
  value: any;
  position: XY;
  width?: number;
  onChange?: (value: any) => void;
  onEnter?: () => void;
}

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
  const bgd = scene.add.rectangle(0, 0, size.x, size.y, 0x555555, 0.9);
  bgd.setStrokeStyle(2, 0x000000, 0.5);
  bgd.setRounded(10);
  bgd.setOrigin(0, 0);
  bgd.setScrollFactor(0);
  bgd.setDepth(0);
  bgd.setBlendMode(Phaser.BlendModes.NORMAL);
  return bgd;
}

const defaultPropWidth = 125;

/** Creates an editable text field for a property in the properties panel */
export function createEditableProperty(props: EditableProperty): void {
  const {
    phaserScene,
    container,
    name,
    value,
    position,
    width,
    onChange,
    onEnter,
  } = props;
  if (!phaserScene || !container) {
    return;
  }

  const label = phaserScene.add.text(
    position.x,
    position.y,
    `${name}:`,
    getDefaultFontStyle(),
  );

  const inputElement = document.createElement("input");
  inputElement.type = "text";
  inputElement.value = value;
  inputElement.style.pointerEvents = "auto";
  inputElement.style.width = `${width || defaultPropWidth}px`;
  inputElement.style.fontFamily = "Consolas, monospace";
  inputElement.style.fontSize = "12px";
  inputElement.style.color = "#ffffff";
  inputElement.style.backgroundColor = "#333333";
  inputElement.style.padding = "2px 4px";
  inputElement.style.border = "1px solid #555555";
  inputElement.style.borderRadius = "4px";
  inputElement.style.outline = "none";
  inputElement.style.transition = "border-color 0.2s";

  const input = phaserScene.add
    .dom(
      position.x + Math.max(label.width, width || defaultPropWidth) + 10,
      position.y,
      inputElement,
    )
  input.setOrigin(0, 0);
  input.setDepth(1000);
  input.setScrollFactor(0);
  input.setBlendMode(Phaser.BlendModes.NORMAL);
  input.setInteractive({
    useHandCursor: true,
    draggable: false,
    hitArea: new Phaser.Geom.Rectangle(
      0,
      0,
      inputElement.offsetWidth,
      inputElement.offsetHeight,
    ),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
  });

  let doubleClickTimer: number | null = null;
  input.on("pointerdown", (event: Phaser.Input.Pointer) => {
    if (doubleClickTimer) {
      clearTimeout(doubleClickTimer);
      doubleClickTimer = null;
      inputElement.select();
    } else {
      doubleClickTimer = window.setTimeout(() => {
        doubleClickTimer = null;
      }, 300);
      inputElement.focus();
      // set cursor to clicked position
      const clickPos = getCaretIndexFromPointer(inputElement, event);
      inputElement.setSelectionRange(clickPos, clickPos);
    }
  });

  input.addListener("keydown");
  input.on("keydown", (event: any) => {
    // Move cursor with arrow keys without triggering onChange
    if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "Tab" ||
      event.key === "Shift" ||
      event.key === "Control"
    ) {
      return;
    }
    const newValue = event.target.value;
    // Call the onChange callback to update the property value
    if (onChange) {
      onChange(newValue);
    }
    // If Enter is pressed, blur the input to trigger any change events
    if (event.key === "Enter") {
      inputElement.blur();
      if (onEnter) {
        onEnter();
      }
    }
  });

  container.add([label, input]);
}
