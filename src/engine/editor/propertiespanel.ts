import Phaser from 'phaser';
import { XY } from '../shared';
import { Editor } from './editor';
import { getDefaultFontStyle, getDefaultBackground } from './editorutils';
import { createEditableProperty } from './editableproperty';
import { getEditableProperties } from './editableproperties';

interface PropertiesPanelConfig {
  onChange?: () => void;
  onEnter?: () => void;
}

export class PropertiesPanel extends Phaser.GameObjects.Container {
  private editor: Editor;
  private config: PropertiesPanelConfig;
  private bounds: Phaser.Geom.Rectangle;
  private size: XY = { x: 280, y: 320 };
  constructor(editor: Editor, x: number, y: number, config: PropertiesPanelConfig = {}) {
    super(editor.getPhaserScene(), x, y);
    this.config = config;
    this.editor = editor;
    this.bounds = new Phaser.Geom.Rectangle(x, y, this.size.x, this.size.y);
    this.create();
  }

  getBounds(): Phaser.Geom.Rectangle {
    this.bounds.setPosition(this.x, this.y);
    return this.bounds;
  }

  /** Creates the editable fields in the properties panel for the selected entity's properties */
  create(): void {
    const selected = this.editor.getSelectedEntity();
    const phaserScene = this.editor.getPhaserScene();
    if (!selected) return;
    
    const bgd = getDefaultBackground(this.scene, this.size);
    this.add(bgd);

    const title = phaserScene.add.text(
      this.size.x / 2 - 5,
      5,
      `${selected.state.name}`,
      getDefaultFontStyle(),
    );
    title.setOrigin(0.5, 0);
    this.add(title);

    getEditableProperties(this.editor).forEach((prop, idx) => {
      createEditableProperty({
        phaserScene: phaserScene,
        container: this,
        name: prop.name || "-Missing-",
        value: prop.value,
        position: {x: 5, y: 30 + idx * 20},
        width: prop.width,
        onChange: (newValue) => {
          prop.onChange?.(newValue);
          this.config.onChange?.();
        },
        onEnter: () => {
          prop.onEnter?.();
          this.config.onEnter?.();
        },
      });
    });
  }
}