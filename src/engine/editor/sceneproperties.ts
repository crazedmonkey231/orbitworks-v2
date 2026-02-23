import Phaser from 'phaser';
import { Editor } from './editor';
import { getDefaultFontStyle, createEditableProperty } from './editorutils';
import { XY } from '../types';

export interface ScenePropertiesConfig {
  onChange: () => void;
  onEnter: () => void;
}

export class ScenePropertiesPanel extends Phaser.GameObjects.Container {
  private editor: Editor;
  private config: ScenePropertiesConfig;
  private bounds: Phaser.Geom.Rectangle;
  private size: XY = { x: 280, y: 125 };
  private leftMargin: number = 5;

  constructor(editor: Editor, x: number, y: number, config: ScenePropertiesConfig) {
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
    const bgd = this.scene.add.rectangle(0, 0, this.size.x, this.size.y, 0x000000, 0.1);
    bgd.setStrokeStyle(2, 0x000000, 0.5);
    bgd.setRounded(10);
    bgd.setOrigin(0, 0);
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
    const gravity = threeScene.getPhysics().getGravity();

    createEditableProperty({
      phaserScene: this.scene,
      container: this,
      name: "Scene Name",
      value: sceneName,
      position: { x: this.leftMargin, y: 30 },
      onChange: (newValue) => {
        editor.setSceneName(newValue);
        this.config.onChange();
      },
      onEnter: () => {
        this.config.onEnter();
      }
    });

    createEditableProperty({
      phaserScene: this.scene,
      container: this,
      name: "Time of Day",
      value: timeOfDay.toString(),
      position: { x: this.leftMargin, y: 50 },
      onChange: (newValue) => {
        const time = parseFloat(newValue);
        if (!isNaN(time)) {
          threeScene.setTimeOfDay(time);
          this.config.onChange();
        }
      },
      onEnter: () => {
        this.config.onEnter();
      }
    });

    createEditableProperty({
      phaserScene: this.scene,
      container: this,
      name: "Fog Density",
      value: threeScene.getWeatherManager().getFogDensity().toString(),
      position: { x: this.leftMargin, y: 70 },
      onChange: (newValue) => {
        const density = parseFloat(newValue);
        if (!isNaN(density)) {
          threeScene.setFogDensity(density);
          this.config.onChange();
        }
      },
      onEnter: () => {
        this.config.onEnter();
      }
    });

    createEditableProperty({
      phaserScene: this.scene,
      container: this,
      name: "Gravity",
      value: `${gravity.x}, ${gravity.y}, ${gravity.z}`,
      position: { x: this.leftMargin, y: 90 },
      onChange: (newValue) => {
        const pos = newValue
          .split(",")
          .map((coord: string) => parseFloat(coord.trim()));
        if (pos.length === 3 && pos.every((coord: number) => !isNaN(coord))) {
          threeScene.setGravity({ x: pos[0], y: pos[1], z: pos[2] });
          this.config.onChange();
        }
      },
      onEnter: () => {
        this.config.onEnter();
      }
    });
  }
}
