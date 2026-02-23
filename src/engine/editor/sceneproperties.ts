import Phaser from "phaser";
import { Editor } from "./editor";
import {
  getDefaultFontStyle,
  createEditableProperty,
  EditableProperty,
  getDefaultBackground,
} from "./editorutils";
import { XY } from "../shared";

export interface ScenePropertiesConfig {
  onChange: () => void;
  onEnter: () => void;
}

class ScenePropertiesButton extends Phaser.GameObjects.Container {
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

export class ScenePropertiesPanel extends Phaser.GameObjects.Container {
  private editor: Editor;
  private config: ScenePropertiesConfig;
  private bounds: Phaser.Geom.Rectangle;
  private size: XY = { x: 280, y: 185 };
  private leftMargin: number = 5;

  constructor(
    editor: Editor,
    x: number,
    y: number,
    config: ScenePropertiesConfig,
  ) {
    super(editor.getPhaserScene(), x, y);
    this.editor = editor;
    this.config = config;
    this.bounds = new Phaser.Geom.Rectangle(x, y, this.size.x, this.size.y);
    this.create();
  }

  getBounds(): Phaser.Geom.Rectangle {
    return this.bounds;
  }

  create() {
    const bgd = getDefaultBackground(this.scene, this.size);
    this.add(bgd);

    const title = this.scene.add.text(this.size.x / 2, 5, "Scene Properties", {
      ...getDefaultFontStyle(),
    });
    title.setOrigin(0.5, 0);
    this.add(title);

    const editor = this.editor;
    const threeScene = this.editor.getThreeScene();
    const sceneName = this.editor.getSceneName();
    const timeOfDay = threeScene.getTimeOfDay();

    const editableProperties: Partial<EditableProperty>[] = [
      {
        name: "Scene Name",
        value: sceneName,
        onChange: (newValue) => {
          editor.setSceneName(newValue);
        },
      },
      {
        name: "Time of Day",
        value: timeOfDay.toString(),
        onChange: (newValue) => {
          const time = parseFloat(newValue);
          if (!isNaN(time)) {
            threeScene.setTimeOfDay(time);
          }
        },
      },
      {
        name: "Fog Density",
        value: threeScene.getWeatherManager().getFogDensity().toString(),
        onChange: (newValue) => {
          const density = parseFloat(newValue);
          if (!isNaN(density)) {
            threeScene.setFogDensity(density);
          }
        },
      },
    ];

    editableProperties.forEach((prop, idx) => {
      createEditableProperty({
        phaserScene: this.scene,
        container: this,
        name: prop.name || "--Missing--",
        value: prop.value,
        position: { x: this.leftMargin, y: 30 + idx * 20 },
        onChange: (newValue) => {
          if (prop.onChange) {
            prop.onChange(newValue);
          }
          this.config.onChange();
        },
        onEnter: () => {
          if (prop.onEnter) {
            prop.onEnter();
          }
          this.config.onEnter();
        },
      });
    });

    const startY = 95;

    const togglePhysicsButton = new ScenePropertiesButton(
      this.scene,
      { x: this.leftMargin, y: startY },
      "Physics",
      { x: 130, y: 25 },
      () => {
        editor.togglePhysics();
      },
    );
    this.add(togglePhysicsButton);

    const togglePauseButton = new ScenePropertiesButton(
      this.scene,
      { x: this.leftMargin + 140, y: startY },
      "Pause",
      { x: 130, y: 25 },
      () => {
        threeScene.togglePause();
      },
    );
    this.add(togglePauseButton);

    const cacheSceneButton = new ScenePropertiesButton(
      this.scene,
      { x: this.leftMargin, y: startY + 30 },
      "Cache Scene",
      { x: 130, y: 25 },
      () => {
        editor.queueSceneStateChange();
      },
    );
    this.add(cacheSceneButton);

    const saveSceneButton = new ScenePropertiesButton(
      this.scene,
      { x: this.leftMargin + 140, y: startY + 30 },
      "Save Scene",
      { x: 130, y: 25 },
      () => {
        editor.saveScene();
      },
    );
    this.add(saveSceneButton);

    const loadSceneButton = new ScenePropertiesButton(
      this.scene,
      { x: this.leftMargin, y: startY + 60 },
      "Load Scene",
      { x: 130, y: 25 },
      () => {
        editor.loadScene();
      },
    );
    this.add(loadSceneButton);

    const undoButton = new ScenePropertiesButton(
      this.scene,
      { x: this.leftMargin + 140, y: startY + 60 },
      "Undo",
      { x: 130, y: 25 },
      () => {
        editor.reloadScene(true);
      },
    );
    this.add(undoButton);
  }
}
