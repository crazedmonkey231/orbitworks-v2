import * as THREE from 'three';
import Phaser from 'phaser';
import { GameplayTags, PhysicsData, XY } from '../types';
import { Editor } from './editor';
import { getDefaultFontStyle, EditableProperty, createEditableProperty } from './editorutils';

interface PropertiesPanelConfig {
  onChange?: () => void;
  onEnter?: () => void;
}

export class PropertiesPanel extends Phaser.GameObjects.Container {
  private editor: Editor;
  private config: PropertiesPanelConfig;
  private bounds: Phaser.Geom.Rectangle;
  private size: XY = { x: 290, y: 320 };
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

    const bgd = phaserScene.add.rectangle(0, 0, this.size.x - 10, this.size.y, 0x000000, 0.1);
    bgd.setStrokeStyle(2, 0x000000, 0.5);
    bgd.setRounded(10);
    bgd.setOrigin(0, 0);
    this.add(bgd);

    const title = phaserScene.add.text(
      this.size.x / 2 - 5,
      5,
      `${selected.state.name}`,
      getDefaultFontStyle(),
    );
    title.setOrigin(0.5, 0);
    this.add(title);

    const editableProperties: Partial<EditableProperty>[] = [
      {
        name: "Name",
        value: selected.state.name,
        onChange: (newValue) => {
          selected.state.name = newValue;
          title.setText(`${newValue}`);
        },
      },
      {
        name: "Entity Type",
        value: selected.state.entityType,
        onChange: (newValue) => {
          // selected!.state.entityType = newValue;
          // Split by # to allow changing type and adding JSON data for components in the future, e.g. "Enemy#{"health":100}"
          const parts = newValue.split("#").map((part: string) => part.trim());
          selected.state.entityType = parts[0];
          if (parts.length > 1) {
            try {
              const extraData = JSON.parse(parts[1]);
              Object.assign(selected.state.userData, extraData);
            } catch (error) {
              // console.warn("Failed to parse extra data JSON:", error);
            }
          }
        },
      },
      {
        name: "Tags",
        value: selected.state.tags.join(", "),
        onChange: (newValue) => {
          selected.state.tags = newValue
            .split(",")
            .map((tag: string) => tag.trim());
        },
      },
      {
        name: "Gameplay Tags",
        value: selected.state.gameplayTags.join(", "),
        onChange: (newValue) => {
          const newTags = newValue.split(",").map((tag: string) => tag.trim());
          const filteredTags = newTags.filter(
            (tag: string) =>
              GameplayTags[tag as keyof typeof GameplayTags] !== undefined,
          );
          selected.state.gameplayTags = filteredTags;
        },
      },
      {
        name: "Components",
        value: selected.state.components
          .map((comp: any) => comp.name)
          .join("&"),
        onChange: (newValue) => {
          // Splits the input by &, then by # to separate component name and JSON data, and constructs the components array. Better UI later...
          const newComponentNames = newValue
            .split("&")
            .map((name: string) => name.trim());
          const newComponents = [];
          for (const compName of newComponentNames) {
            try {
              const comp = compName
                .split("#")
                .map((part: string) => part.trim());
              if (comp.length === 2) {
                newComponents.push({
                  name: comp[0],
                  compType: comp[0],
                  ...JSON.parse(comp[1]),
                });
              } else {
                newComponents.push({ name: comp[0], compType: comp[0] });
              }
            } catch (error) {
              // console.warn("Failed to parse component data JSON:", error);
            }
          }
          selected.state.components = newComponents;
        },
      },
      {
        name: "Box Data",
        value: `${selected.state.userData.width?.toFixed(
          2,
        )}, ${selected.state.userData.height?.toFixed(
          2,
        )}, ${selected.state.userData.depth?.toFixed(2)}`,
        onChange: (newValue) => {
          const pos = newValue
            .split(",")
            .map((coord: string) => parseFloat(coord.trim()));
          if (pos.length === 3) {
            selected.state.userData.width = pos[0];
            selected.state.userData.height = pos[1];
            selected.state.userData.depth = pos[2];
          }
        },
      },
      {
        name: "Sphere Data",
        value: `${selected.state.userData.radius?.toFixed(
          2,
        )}, ${selected.state.userData.segments?.toFixed(2)}`,
        onChange: (newValue) => {
          const pos = newValue
            .split(",")
            .map((coord: string) => parseFloat(coord.trim()));
          if (pos.length === 2) {
            selected.state.userData.radius = pos[0];
            selected.state.userData.segments = pos[1];
          }
        },
      },
      {
        name: "Position",
        value: `${selected.state.userData.transform!.position.x.toFixed(
          2,
        )}, ${selected.state.userData.transform!.position.y.toFixed(
          2,
        )}, ${selected.state.userData.transform!.position.z.toFixed(2)}`,
        onChange: (newValue) => {
          const pos = newValue
            .split(",")
            .map((coord: string) => parseFloat(coord.trim()));
          if (pos.length === 3) {
            selected.state.userData.transform!.position =
              new THREE.Vector3(pos[0], pos[1], pos[2]);
          }
        },
      },
      {
        name: "Rotation",
        value: `${THREE.MathUtils.radToDeg(
          selected.state.userData.transform!.rotation.x,
        ).toFixed(2)}, ${THREE.MathUtils.radToDeg(
          selected.state.userData.transform!.rotation.y,
        ).toFixed(2)}, ${THREE.MathUtils.radToDeg(
          selected.state.userData.transform!.rotation.z,
        ).toFixed(2)}`,
        onChange: (newValue) => {
          const rot = newValue
            .split(",")
            .map((angle: string) =>
              THREE.MathUtils.degToRad(parseFloat(angle.trim())),
            );
          if (rot.length === 3) {
            selected.state.userData.transform!.quaternion = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(rot[0], rot[1], rot[2]),
            );
          }
        },
      },
      {
        name: "Scale",
        value: `${selected.state.userData.transform!.scale.x.toFixed(
          2,
        )}, ${selected.state.userData.transform!.scale.y.toFixed(
          2,
        )}, ${selected.state.userData.transform!.scale.z.toFixed(2)}`,
        onChange: (newValue) => {
          const scale = newValue
            .split(",")
            .map((factor: string) => parseFloat(factor.trim()));
          if (scale.length === 3) {
            selected.state.userData.transform!.scale = new THREE.Vector3(
              scale[0],
              scale[1],
              scale[2],
            );
          }
        },
      },
      {
        name: "Mass",
        value:
          selected.state.userData.physicsData?.mass?.toString() || "0",
        onChange: (newValue) => {
          const mass = parseFloat(newValue);
          if (!isNaN(mass)) {
            if (!selected.state.userData.physicsData) {
              selected.state.userData.physicsData = {
                mass: mass,
              } as PhysicsData;
            } else {
              selected.state.userData.physicsData!.mass = mass;
            }
          }
        },
      },
      {
        name: "Friction",
        value:
          selected.state.userData.physicsData?.friction?.toString() || "0",
        onChange: (newValue) => {
          const friction = parseFloat(newValue);
          if (!isNaN(friction)) {
            if (!selected.state.userData.physicsData) {
              selected.state.userData.physicsData = {
                friction: friction,
              } as PhysicsData;
            } else {
              selected.state.userData.physicsData!.friction = friction;
            }
          }
        },
      },
      {
        name: "Density",
        value:
          selected.state.userData.physicsData?.density?.toString() || "0",
        onChange: (newValue) => {
          const density = parseFloat(newValue);
          if (!isNaN(density)) {
            if (!selected.state.userData.physicsData) {
              selected.state.userData.physicsData = {
                density: density,
              } as PhysicsData;
            } else {
              selected.state.userData.physicsData!.density = density;
            }
          }
        },
      },
      {
        name: "Restitution",
        value:
          selected.state.userData.physicsData?.restitution?.toString() ||
          "0",
        onChange: (newValue) => {
          const restitution = parseFloat(newValue);
          if (!isNaN(restitution)) {
            if (!selected.state.userData.physicsData) {
              selected.state.userData.physicsData = {
                restitution: restitution,
              } as PhysicsData;
            } else {
              selected.state.userData.physicsData!.restitution =
                restitution;
            }
          }
        },
      },
    ];
    editableProperties.forEach((prop, idx) => {
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