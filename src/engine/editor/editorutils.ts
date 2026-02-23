import { XY } from "../types";
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
    fontSize: "14px",
    fontFamily: "Consolas, monospace",
    color: "#ffffff",
    stroke: "#000000",
    strokeThickness: 3,
  };
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
  inputElement.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.5)";

  const input = phaserScene.add
    .dom(
      position.x + Math.max(label.width, width || defaultPropWidth) + 10,
      position.y,
    )
    .createElement("input");
  input.setOrigin(0, 0);
  input.setElement(inputElement);
  input.setScrollFactor(0);
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
  input.setAlpha(1);

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