import * as THREE from "three";
import { getCaretIndexFromPointer } from "./utils";
import { ThreeSceneBase } from "./threescenebase";
import {
  EntityState,
  XY,
  GameSceneState,
  PhysicsState,
  Entity,
  GameplayTags,
  PhysicsData,
} from "./core";
import {
  TransformControls,
  TransformControlsMode,
} from "three/examples/jsm/Addons.js";
import { EntityFactory } from "./entityfactory";

interface EntitySelection {
  entity: Entity;
  state: EntityState;
}

interface EditableProperty {
  name: string;
  value: any;
  position: XY;
  onChange: (value: any) => void;
}

function getDefaultFontStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontSize: "16px",
    fontFamily: "Consolas, monospace",
    color: "#ffffff",
    stroke: "#555555",
    strokeThickness: 3,
    shadow: {
      offsetX: 2,
      offsetY: 2,
      color: "#242424",
      blur: 2,
      stroke: true,
      fill: true,
    },
  };
}

/**
 * Editor class for editing 3D scenes and using phaser for the UI
 */
export class Editor {
  private phaserScene: Phaser.Scene;
  private threeScene: ThreeSceneBase;
  private hudContainer!: Phaser.GameObjects.Container;
  private propertiesPanel!: Phaser.GameObjects.Container;
  private selected: EntitySelection | null = null;
  private sceneName: string = "my_scene";
  private stateQueue: GameSceneState[] = [];
  private transformControls: TransformControls;
  private gizmo: THREE.Object3D | null = null;
  private toggleGizmo: boolean = true;
  private toggleText: Phaser.GameObjects.Text | null = null;
  private propertiesPanelPosition: XY = { x: 10, y: 60 };

  constructor(phaserScene: Phaser.Scene, threeScene: ThreeSceneBase) {
    this.phaserScene = phaserScene;
    this.threeScene = threeScene;
    this.threeScene
      .getPostProcess()
      .addOutline("selectedOutline", this.threeScene, {
        edgeStrength: 5,
        edgeThickness: 1,
        visibleEdgeColor: "#ffff00",
        hiddenEdgeColor: "#ffff00",
        pulsePeriod: 0,
        selectedObjects: [],
      });
    this.transformControls = new TransformControls(
      this.threeScene.getCamera(),
      phaserScene.game.canvas,
    );
    this.createHud();
    this.refreshInfoText();
    this.queueSceneStateChange(); // Cache the initial state of the scene
  }

  /** Creates the toggle gizmo text in the HUD */
  refreshInfoText(): void {
    if (this.toggleText) {
      this.toggleText.destroy();
    }
    const state = this.toggleGizmo ? "ON" : "OFF";
    this.toggleText = this.phaserScene.add.text(
      10,
      this.phaserScene.scale.height - 60,
      `Gizmo: ${state} (Esc to toggle)\nPhysics: ${this.threeScene.getPhysics().getEnabled() ? "ON" : "OFF"}`,
      getDefaultFontStyle(),
    );
    this.toggleText.setOrigin(0, 0);
    this.toggleText.setScrollFactor(0);
    this.toggleText.setDepth(0);
  }

  /** Creates the HUD with top bar, side bars, and bottom bar */
  createHud(): void {
    const topBarHeight = 50;
    const bgColor = 0x222222;
    const bgAlpha = 0.1;
    const sideBarWidth = 300;

    const topBar = this.phaserScene.add.rectangle(
      0,
      0,
      this.phaserScene.scale.width,
      topBarHeight,
      bgColor,
      bgAlpha,
    );
    topBar.setOrigin(0, 0);
    topBar.setScrollFactor(0);

    const leftSideBar = this.phaserScene.add.rectangle(
      0,
      topBarHeight,
      sideBarWidth,
      this.phaserScene.scale.height - topBarHeight,
      bgColor,
      bgAlpha,
    );
    leftSideBar.setOrigin(0, 0);
    leftSideBar.setScrollFactor(0);

    this.hudContainer = this.phaserScene.add.container(0, 0, [
      topBar,
      leftSideBar,
    ]);
    this.hudContainer.setScrollFactor(0);
    this.hudContainer.setDepth(0);

    // Create buttons in the top toolbar
    this.createTopToolbar();

    // Set up click handling for selecting objects in the scene
    this.phaserScene.input.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer) => {
        if (pointer.x < sideBarWidth || pointer.y < topBarHeight) {
          return;
        }
        if (pointer.rightButtonDown()) {
          return;
        }
        const mousePos: XY = { x: pointer.x, y: pointer.y };
        const filterFunc = (obj: THREE.Object3D) => {
          if (!obj.visible || !obj) {
            return false;
          }
          if (obj === this.gizmo) {
            return true;
          }
          if (!(obj instanceof THREE.Mesh)) {
            return false;
          }
          return obj.userData.entity;
        };
        const raycastResult = this.threeScene.raycastFromCamera(
          mousePos,
          filterFunc,
        );
        // console.log("Raycast result:", raycastResult);
        if (raycastResult.length > 0) {
          const gizmoIdx = raycastResult.findIndex(
            (res) => res.object.parent === this.gizmo,
          );
          const selectedObj = raycastResult.findIndex(
            (res) => res.object.userData.entity,
          );
          // console.log("Gizmo index:", gizmoIdx, "Selected object index:", selectedObj);
          if (gizmoIdx > 0 && gizmoIdx < selectedObj) {
            return;
          }
          this.selectObject(raycastResult[selectedObj]);
          return;
        }
        this.deselectObject();
      },
    );

    this.phaserScene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < sideBarWidth || pointer.y < topBarHeight) {
        return;
      }
      this.queueSceneStateChange();
    });

    this.transformControls.addEventListener("dragging-changed", (event) => {
      (this.threeScene as any).orbitControls.enabled = !event.value;
      if (event.value) {
        this.threeScene.togglePhysics(false);
        this.refreshInfoText();
      } else {
        this.queueSceneStateChange();
        this.reloadScene(true);
        this.refreshPropertiesPanel();
      }
    });

    this.transformControls.addEventListener("objectChange", () => {
      if (this.selected && this.selected.entity) {
        this.selected.state = this.selected.entity.saveState();
        this.refreshPropertiesPanel(this.propertiesPanelPosition);
      }
    });

    // Key handling esc for deselect and toggle gizmo
    this.phaserScene.input.keyboard?.on("keydown-ESC", () => {
      this.deselectObject();
      this.refreshPropertiesPanel();
      this.toggleGizmo = !this.toggleGizmo;
      this.refreshInfoText();
    });

    // ctrl+z for undo
    this.phaserScene.input.keyboard?.on("keydown-Z", (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        this.reloadScene(true);
        this.refreshPropertiesPanel();
      }
    });

    // ctrl+s for save
    this.phaserScene.input.keyboard?.on("keydown-S", (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
        this.saveScene();
      }
    });

    // ctrl+shift+d for duplicate
    this.phaserScene.input.keyboard?.on("keydown-D", (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        this.selected &&
        this.selected.entity
      ) {
        this.refreshPropertiesPanel();
        const entity = this.selected.entity;
        const duplicated = EntityFactory.duplicateEntity(
          this.threeScene,
          entity,
        );
        this.threeScene.addEntity(duplicated);
        this.selected = {
          entity: duplicated,
          state: duplicated.saveState(),
        };
        this.queueSceneStateChange();
        this.selectEntity(duplicated);
      }
    });

    // Tab cycle modes
    this.phaserScene.input.keyboard?.on(
      "keydown-TAB",
      (event: KeyboardEvent) => {
        event.preventDefault();
        const modeCycle: TransformControlsMode[] = [
          "translate",
          "rotate",
          "scale",
        ];
        const currentMode = this.transformControls.getMode();
        const nextMode =
          modeCycle[(modeCycle.indexOf(currentMode) + 1) % modeCycle.length];
        this.transformControls.setMode(nextMode);
      },
    );

    // Delete key to remove selected entity
    this.phaserScene.input.keyboard?.on("keydown-DELETE", () => {
      if (this.selected && this.selected.entity) {
        this.clearGizmo();
        const selected = this.selected.entity;
        this.selected = null;
        this.deselectObject();
        selected.kill();
        this.queueSceneStateChange();
      }
    });
  }

  clearGizmo(): void {
    if (this.gizmo) {
      this.transformControls.detach();
      this.threeScene.remove(this.gizmo);
      this.gizmo = null;
    }
  }

  togglePhysics(override?: boolean): void {
    this.threeScene.togglePhysics(override);
    this.refreshInfoText();
  }

  selectEntity(entity: Entity): void {
    this.clearGizmo();
    // console.log("Selected entity:", entity);
    this.selected = {
      entity: entity,
      state: entity.saveState(),
    };
    const object3D = entity.getObject3D();
    this.threeScene.setOutlineSelectedObjects("selectedOutline", [object3D]);
    this.transformControls.attach(object3D);
    this.gizmo = this.transformControls.getHelper();
    this.threeScene.add(this.gizmo);
    this.refreshPropertiesPanel(this.propertiesPanelPosition);
  }

  selectObject(obj: THREE.Intersection): void {
    if (!obj || !obj.object.userData.entity || this.toggleGizmo === false) {
      return;
    }
    const entity = obj.object.userData.entity;
    if (this.selected && this.selected.entity === entity) {
      return;
    }
    this.selectEntity(entity);
  }

  deselectObject(): void {
    this.clearGizmo();
    this.selected = null;
    this.threeScene.setOutlineSelectedObjects("selectedOutline", []);
  }

  saveScene(): void {
    this.threeScene.saveSceneToFile(this.sceneName);
    // After saving, queue the current state
    this.queueSceneStateChange();
    // Remove all but last state to keep only one saved state after saving
    if (this.stateQueue.length > 1) {
      this.stateQueue = [this.stateQueue[this.stateQueue.length - 1]];
    }
  }

  loadScene(): void {
    this.clearGizmo();
    this.threeScene.loadSceneFromFile(this.sceneName);
  }

  reloadScene(popCached: boolean = false): void {
    let currentState: GameSceneState | null = null;
    if (popCached) {
      if (this.stateQueue.length > 1) {
        currentState = this.stateQueue.pop()!;
      }
    } else if (this.stateQueue.length > 0) {
      currentState = this.stateQueue[this.stateQueue.length - 1];
    }
    if (currentState) {
      this.clearGizmo();
      this.togglePhysics(false);
      this.threeScene.loadSceneState(currentState);
      this.refreshInfoText();
    }
  }

  /** Creates the top toolbar with buttons for actions like save/load */
  createTopToolbar(): void {
    const buttonData = [
      { label: "Toggle Pause", action: () => this.threeScene.togglePause() },
      { label: "Save Scene", action: () => this.saveScene() },
      { label: "Load Scene", action: () => this.loadScene() },
      { label: "Cache Scene", action: () => this.queueSceneStateChange() },
      { label: "Pop Cached", action: () => this.reloadScene(true) },
      { label: "Toggle Physics", action: () => this.togglePhysics() },
    ];
    const buttonSpacing = 10;
    let currentX = buttonSpacing;
    buttonData.forEach((btn) => {
      const button = this.phaserScene.add.text(currentX, 10, btn.label, {
        backgroundColor: "#555555",
        padding: { x: 10, y: 5 },
        ...getDefaultFontStyle(),
      });
      button.setOrigin(0, 0);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", btn.action);
      this.hudContainer.add(button);
      currentX += button.width + buttonSpacing;
    });

    this.createEditableProperty(
      "Scene Name",
      this.sceneName,
      { x: currentX, y: 15 },
      this.hudContainer,
      (newValue) => {
        this.sceneName = newValue;
      },
      100,
    );

    this.createEditableProperty(
      "Time of Day",
      this.threeScene.getTimeOfDay().toString(),
      { x: currentX + 225, y: 15 },
      this.hudContainer,
      (newValue) => {
        const time = parseFloat(newValue);
        if (!isNaN(time)) {
          this.threeScene.setTimeOfDay(time);
        }
      },
      100,
    );
  }

  /** Checks and possibly adds the scene state to the state queue for undo/redo functionality */
  queueSceneStateChange(): void {
    if (this.selected) {
      const entity = this.selected.entity;
      if (entity && entity.getAlive()) {
        entity.removeAllComponents();
        entity.loadState(this.selected.state);
      }
    }
    const gameSceneState = this.threeScene.saveSceneState();
    this.stateQueue.push(gameSceneState);
    if (this.stateQueue.length > 1000) {
      this.stateQueue.shift();
    }
  }

  /** Creates an editable text field for a property in the properties panel */
  createEditableProperty(
    name: string,
    value: string,
    position: XY,
    container: Phaser.GameObjects.Container,
    onChange: (value: any) => void,
    minWidth: number = 130,
  ): void {
    const label = this.phaserScene.add.text(
      position.x,
      position.y,
      `${name}:`,
      getDefaultFontStyle(),
    );

    const inputElement = document.createElement("input");
    inputElement.type = "text";
    inputElement.value = value;
    inputElement.style.pointerEvents = "auto";
    inputElement.style.width = `${minWidth}px`;
    inputElement.style.fontFamily = "Consolas, monospace";
    inputElement.style.fontSize = "12px";

    const input = this.phaserScene.add
      .dom(position.x + Math.max(label.width, minWidth) + 10, position.y)
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
      onChange(newValue);
      // After applying change, update the entity with the new state
      this.queueSceneStateChange();
      // If Enter is pressed, blur the input to trigger any change events
      if (event.key === "Enter") {
        inputElement.blur();
        this.reloadScene(true);
        this.refreshPropertiesPanel();
      }
    });

    container.add([label, input]);
  }

  /** Creates the properties panel UI based on the currently selected entity */
  refreshPropertiesPanel(position?: XY): void {
    if (this.propertiesPanel) {
      this.propertiesPanel.destroy(true);
    }
    if (!position) {
      return;
    }
    this.propertiesPanel = this.phaserScene.add.container(
      position.x,
      position.y,
    );
    this.createPropertyFields();
  }

  /** Creates the editable fields in the properties panel for the selected entity's properties */
  createPropertyFields(): void {
    if (!this.selected) return;
    const title = this.phaserScene.add.text(
      0,
      0,
      `Selected: ${this.selected.state.name}`,
      getDefaultFontStyle(),
    );
    this.propertiesPanel.add(title);

    const editableProperties: EditableProperty[] = [
      {
        name: "Name",
        value: this.selected.state.name,
        position: { x: 5, y: 30 },
        onChange: (newValue) => {
          this.selected!.state.name = newValue;
          title.setText(`Selected: ${newValue}`);
        },
      },
      {
        name: "Entity Type",
        value: this.selected.state.entityType,
        position: { x: 5, y: 60 },
        onChange: (newValue) => {
          // this.selected!.state.entityType = newValue;
          // Split by # to allow changing type and adding JSON data for components in the future, e.g. "Enemy#{"health":100}"
          const parts = newValue.split("#").map((part: string) => part.trim());
          this.selected!.state.entityType = parts[0];
          if (parts.length > 1) {
            try {
              const extraData = JSON.parse(parts[1]);
              Object.assign(this.selected!.state.userData, extraData);
            } catch (error) {
              // console.warn("Failed to parse extra data JSON:", error);
            }
          }
        },
      },
      {
        name: "Tags",
        value: this.selected.state.tags.join(", "),
        position: { x: 5, y: 90 },
        onChange: (newValue) => {
          this.selected!.state.tags = newValue
            .split(",")
            .map((tag: string) => tag.trim());
        },
      },
      {
        name: "Gameplay Tags",
        value: this.selected.state.gameplayTags.join(", "),
        position: { x: 5, y: 120 },
        onChange: (newValue) => {
          const newTags = newValue.split(",").map((tag: string) => tag.trim());
          const filteredTags = newTags.filter(
            (tag: string) =>
              GameplayTags[tag as keyof typeof GameplayTags] !== undefined,
          );
          this.selected!.state.gameplayTags = filteredTags;
        },
      },
      {
        name: "Components",
        value: this.selected.state.components
          .map((comp: any) => comp.name)
          .join("&"),
        position: { x: 5, y: 150 },
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
                console
              } else {
                newComponents.push({ name: comp[0], compType: comp[0] });
              }
            } catch (error) {
              // console.warn("Failed to parse component data JSON:", error);
            }
          }
          this.selected!.state.components = newComponents;
        },
      },
      {
        name: "Box Data",
        value: `${this.selected.state.userData.width?.toFixed(
          2,
        )}, ${this.selected.state.userData.height?.toFixed(
          2,
        )}, ${this.selected.state.userData.depth?.toFixed(2)}`,
        position: { x: 5, y: 180 },
        onChange: (newValue) => {
          const pos = newValue
            .split(",")
            .map((coord: string) => parseFloat(coord.trim()));
          if (pos.length === 3) {
            this.selected!.state.userData.width = pos[0];
            this.selected!.state.userData.height = pos[1];
            this.selected!.state.userData.depth = pos[2];
          }
        },
      },
      {
        name: "Sphere Data",
        value: `${this.selected.state.userData.radius?.toFixed(
          2,
        )}, ${this.selected.state.userData.segments?.toFixed(2)}`,
        position: { x: 5, y: 210 },
        onChange: (newValue) => {
          const pos = newValue
            .split(",")
            .map((coord: string) => parseFloat(coord.trim()));
          if (pos.length === 2) {
            this.selected!.state.userData.radius = pos[0];
            this.selected!.state.userData.segments = pos[1];
          }
        },
      },
      {
        name: "Position",
        value: `${this.selected.state.userData.transform!.position.x.toFixed(
          2,
        )}, ${this.selected.state.userData.transform!.position.y.toFixed(
          2,
        )}, ${this.selected.state.userData.transform!.position.z.toFixed(2)}`,
        position: { x: 5, y: 240 },
        onChange: (newValue) => {
          const pos = newValue
            .split(",")
            .map((coord: string) => parseFloat(coord.trim()));
          if (pos.length === 3) {
            this.selected!.state.userData.transform!.position =
              new THREE.Vector3(pos[0], pos[1], pos[2]);
          }
        },
      },
      {
        name: "Rotation",
        value: `${THREE.MathUtils.radToDeg(
          this.selected.state.userData.transform!.rotation.x,
        ).toFixed(2)}, ${THREE.MathUtils.radToDeg(
          this.selected.state.userData.transform!.rotation.y,
        ).toFixed(2)}, ${THREE.MathUtils.radToDeg(
          this.selected.state.userData.transform!.rotation.z,
        ).toFixed(2)}`,
        position: { x: 5, y: 270 },
        onChange: (newValue) => {
          const rot = newValue
            .split(",")
            .map((angle: string) =>
              THREE.MathUtils.degToRad(parseFloat(angle.trim())),
            );
          if (rot.length === 3) {
            this.selected!.state.userData.transform!.rotation = new THREE.Euler(
              rot[0],
              rot[1],
              rot[2],
            );
          }
        },
      },
      {
        name: "Scale",
        value: `${this.selected.state.userData.transform!.scale.x.toFixed(
          2,
        )}, ${this.selected.state.userData.transform!.scale.y.toFixed(
          2,
        )}, ${this.selected.state.userData.transform!.scale.z.toFixed(2)}`,
        position: { x: 5, y: 300 },
        onChange: (newValue) => {
          const scale = newValue
            .split(",")
            .map((factor: string) => parseFloat(factor.trim()));
          if (scale.length === 3) {
            this.selected!.state.userData.transform!.scale = new THREE.Vector3(
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
          this.selected.state.userData.physicsData?.mass?.toString() || "0",
        position: { x: 5, y: 330 },
        onChange: (newValue) => {
          const mass = parseFloat(newValue);
          if (!isNaN(mass)) {
            if (!this.selected!.state.userData.physicsData) {
              this.selected!.state.userData.physicsData = {
                mass: mass,
              } as PhysicsData;
            } else {
              this.selected!.state.userData.physicsData!.mass = mass;
            }
          }
        },
      },
      {
        name: "Friction",
        value:
          this.selected.state.userData.physicsData?.friction?.toString() || "0",
        position: { x: 5, y: 360 },
        onChange: (newValue) => {
          const friction = parseFloat(newValue);
          if (!isNaN(friction)) {
            if (!this.selected!.state.userData.physicsData) {
              this.selected!.state.userData.physicsData = {
                friction: friction,
              } as PhysicsData;
            } else {
              this.selected!.state.userData.physicsData!.friction = friction;
            }
          }
        },
      },
      {
        name: "Density",
        value:
          this.selected.state.userData.physicsData?.density?.toString() || "0",
        position: { x: 5, y: 390 },
        onChange: (newValue) => {
          const density = parseFloat(newValue);
          if (!isNaN(density)) {
            if (!this.selected!.state.userData.physicsData) {
              this.selected!.state.userData.physicsData = {
                density: density,
              } as PhysicsData;
            } else {
              this.selected!.state.userData.physicsData!.density = density;
            }
          }
        },
      },
      {
        name: "Restitution",
        value:
          this.selected.state.userData.physicsData?.restitution?.toString() ||
          "0",
        position: { x: 5, y: 420 },
        onChange: (newValue) => {
          const restitution = parseFloat(newValue);
          if (!isNaN(restitution)) {
            if (!this.selected!.state.userData.physicsData) {
              this.selected!.state.userData.physicsData = {
                restitution: restitution,
              } as PhysicsData;
            } else {
              this.selected!.state.userData.physicsData!.restitution =
                restitution;
            }
          }
        },
      },
    ];

    for (const prop of editableProperties) {
      this.createEditableProperty(
        prop.name,
        prop.value,
        prop.position,
        this.propertiesPanel,
        prop.onChange,
      );
    }
  }
}
