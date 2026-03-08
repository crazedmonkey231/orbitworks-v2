import * as THREE from "three";
import { ThreeSceneBase } from "../threescenebase";
import { EntityState, XY, ThreeSceneState, DOWN_AXIS } from "../shared";
import {
  TransformControls,
  TransformControlsMode,
} from "three/examples/jsm/Addons.js";
import { createAddEntities, duplicateEntity } from "../entityfactory";
import { Entity } from "../entity";
import { PropertiesPanel } from "./propertiespanel";
import { ToolBar } from "./toolbar";
import { getDefaultFontStyle } from "./editorutils";
import { ScenePropertiesPanel } from "./sceneproperties";
import { EntityBuilderPanel } from "./entitybuilder/entitybuilderpanel";

export interface EntitySelection {
  entity: Entity;
  state: EntityState;
}

/**
 * Editor class for editing 3D scenes and using phaser for the UI
 */
export class Editor {
  private phaserScene: Phaser.Scene;
  private threeScene: ThreeSceneBase;
  private hudContainer!: Phaser.GameObjects.Container;
  private propertiesPanel?: PropertiesPanel;
  private toolBar?: ToolBar;
  private sceneProperties?: ScenePropertiesPanel;
  private entityBuilder?: EntityBuilderPanel;
  private selected: EntitySelection | null = null;

  private sceneName: string = "default_scene";
  private stateQueue: ThreeSceneState[] = [];
  private transformControls: TransformControls;
  private gizmo: THREE.Object3D | null = null;
  private toggleGizmo: boolean = true;
  private toggleText: Phaser.GameObjects.Text | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private dragging: boolean = false;

  constructor(phaserScene: Phaser.Scene, threeScene: ThreeSceneBase, sceneName?: string) {
    this.phaserScene = phaserScene;
    this.threeScene = threeScene;
    if (sceneName) {
      this.sceneName = sceneName;
    }
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
    this.queueSceneStateChange();

    // Listen for window resize to adjust HUD layout
    window.addEventListener("resize", () => {
      this.resize();
    });
  }

  getPhaserScene(): Phaser.Scene {
    return this.phaserScene;
  }

  getThreeScene(): ThreeSceneBase {
    return this.threeScene;
  }

  getSelectedEntity(): EntitySelection | null {
    return this.selected;
  }

  getHudContainer(): Phaser.GameObjects.Container {
    return this.hudContainer;
  }

  getSceneName(): string {
    return this.sceneName;
  }

  setSceneName(name: string): void {
    this.sceneName = name;
  }

  setSelectedStateValue(property: string, value: any): void {
    if (this.selected) {
      (this.selected.state as any)[property] = value;
    }
  }

  getMenuPosition(): XY {
    const x = window.innerWidth - 285;
    const y = 5;
    if (this.sceneProperties) {
      return { x, y: this.sceneProperties.getBounds().bottom + 5 };
    }
    return { x, y };
  }

  resize(): void {
    this.refreshTopToolbar();
    this.removeScenePropertiesPanel();
    this.refreshScenePropertiesPanel(this.getMenuPosition());
    this.refreshEntityPropertiesPanel(this.getMenuPosition());
    this.refreshInfoText();
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
    this.hudContainer = this.phaserScene.add.container(0, 0);
    this.hudContainer.setScrollFactor(0);
    this.hudContainer.setDepth(0);

    // refresh widgets
    this.resize();

    // Set up click handling for selecting objects in the scene
    this.phaserScene.input.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer) => {
        const inMenu = this.isInMenu(pointer);
        if (inMenu || pointer.rightButtonDown()) {
          return;
        }
        this.raycastScreenPosition({ x: pointer.x, y: pointer.y });
      },
    );

    this.phaserScene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const inMenu = this.isInMenu(pointer);
      if (inMenu || pointer.rightButtonDown()) {
        return;
      }
    });

    this.phaserScene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const inMenu = this.isInMenu(pointer);
      (this.threeScene as any).orbitControls.enabled = !inMenu && !this.dragging;
    });

    this.transformControls.addEventListener("dragging-changed", (event) => {
      (this.threeScene as any).orbitControls.enabled = !event.value;
      this.dragging = event.value as boolean;
      if (event.value) {
        this.threeScene.togglePhysics(false);
        this.refreshInfoText();
      } else {
        this.queueSceneStateChange();
        this.reloadScene(true);
        this.refreshEntityPropertiesPanel();
      }
    });

    this.transformControls.addEventListener("objectChange", () => {
      if (this.selected && this.selected.entity) {
        this.selected.state = this.selected.entity.saveState();
        this.refreshEntityPropertiesPanel(this.getMenuPosition());
      }
    });

    // Key handling esc for deselect and toggle gizmo
    this.phaserScene.input.keyboard?.on("keydown-ESC", () => {
      this.deselectObject();
      this.refreshEntityPropertiesPanel();
      this.toggleGizmo = !this.toggleGizmo;
      this.refreshInfoText();
    });

    // ctrl+z for undo
    this.phaserScene.input.keyboard?.on("keydown-Z", (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        this.reloadScene(true);
        this.refreshEntityPropertiesPanel();
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
        this.refreshEntityPropertiesPanel();
        const entity = this.selected.entity;
        const duplicated = duplicateEntity(this.threeScene, entity);
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

    this.phaserScene.input.keyboard?.on("keydown-END", () => {
      if (this.selected && this.selected.entity) {
        // Snap to raycast hit point
        const origin = new THREE.Vector3();
        origin.setFromMatrixPosition(
          this.selected.entity.getObject3D().matrixWorld,
        );
        this.raycaster.set(origin, DOWN_AXIS);
        const intersects = this.raycaster
          .intersectObjects(this.threeScene.children, true)
          .filter(
            (intersect) =>
              intersect.object.userData.entity &&
              intersect.object.userData.entity !== this.selected?.entity &&
              intersect.object.parent !== this.selected?.entity.getObject3D()
          );
        console.log("Raycast intersects:", intersects);
        if (intersects.length > 0) {
          const point: THREE.Vector3 = intersects[0].point;
          point.y +=
            (this.selected.entity.getBounds().max.y -
              this.selected.entity.getBounds().min.y) /
            2;
          this.selected.entity.setTransform({
            ...this.selected.entity.getTransform(),
            position: point,
          });
          this.selected.state = this.selected.entity.saveState();
          this.refreshEntityPropertiesPanel(this.getMenuPosition());
        }
      }
    });
  }

  isInMenu(pointer: Phaser.Input.Pointer): boolean {
    const inMenu =
      (this.propertiesPanel &&
        this.propertiesPanel.getBounds().contains(pointer.x, pointer.y)) ||
      (this.toolBar &&
        this.toolBar.getBounds().contains(pointer.x, pointer.y)) ||
      (this.sceneProperties &&
        this.sceneProperties.getBounds().contains(pointer.x, pointer.y)) ||
      this.entityBuilder !== undefined;
    return inMenu || false;
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
    this.refreshEntityPropertiesPanel(this.getMenuPosition());
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

  inspectSelected(): void {
    if (!this.selected || !this.selected.entity) {
      return;
    }
    const entity = this.selected.entity;
    console.log("Inspecting entity:", entity);
    console.log("State:", entity.saveState());
  }

  deselectObject(): void {
    this.clearGizmo();
    this.refreshEntityPropertiesPanel();
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
    this.deselectObject();
    this.toggleScenePropertiesPanel();
    this.threeScene.loadSceneFromFile(this.sceneName).then(() => {
      this.queueSceneStateChange();
      this.resize();
    });
  }

  reloadScene(popCached: boolean = false, keepSelected: boolean = false): void {
    let currentState: ThreeSceneState | null = null;
    if (popCached) {
      if (this.stateQueue.length > 1) {
        currentState = this.stateQueue.pop()!;
      }
    } else if (this.stateQueue.length > 0) {
      currentState = this.stateQueue[this.stateQueue.length - 1];
    }
    if (currentState) {
      if (keepSelected && this.selected) {
        this.deselectObject();
      }
      this.togglePhysics(false);
      this.removeScenePropertiesPanel();
      this.threeScene.loadSceneState(currentState);
      this.refreshInfoText();
    }
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

  /** Performs a raycast from the camera based on screen position to select objects in the scene */
  raycastScreenPosition(position: XY): void {
    const filterFunc = (obj: THREE.Object3D) => {
      if (obj && obj.visible && (obj.userData.entity || obj === this.gizmo)) {
        return true;
      }
      return false;
    };
    const raycastResult = this.threeScene.raycastFromCamera(
      position,
      filterFunc,
    );
    if (raycastResult.length > 0) {
      const gizmoIdx = raycastResult.findIndex(
        (res) => res.object.parent === this.gizmo,
      );
      const selectedObj = raycastResult.findIndex(
        (res) => res.object.userData.entity,
      );
      if (gizmoIdx === 0 && selectedObj === -1) {
        this.deselectObject();
        return;
      }
      if (gizmoIdx > 0 && gizmoIdx < selectedObj) {
        return;
      } else {
        this.selectObject(raycastResult[selectedObj]);
        return;
      }
    }
    this.deselectObject();
  }

  removeEntityPropertiesPanel() {
    if (this.propertiesPanel) {
      this.propertiesPanel.destroy(true);
      this.propertiesPanel = undefined;
    }
  }

  /** Creates the properties panel UI based on the currently selected entity */
  refreshEntityPropertiesPanel(position?: XY): void {
    this.removeEntityPropertiesPanel();
    if (!position) {
      return;
    }
    this.propertiesPanel = new PropertiesPanel(this, position.x, position.y, {
      onChange: () => {
        this.queueSceneStateChange();
      },
      onEnter: () => {
        this.queueSceneStateChange();
      },
    });
    this.hudContainer.add(this.propertiesPanel);
  }

  /** Creates the top toolbar with buttons for common actions */
  refreshTopToolbar(): void {
    if (this.toolBar) {
      this.toolBar.destroy(true);
      this.toolBar = undefined;
    }
    this.toolBar = new ToolBar(this, 0, 0);
    this.hudContainer.add(this.toolBar);
  }

  removeScenePropertiesPanel() {
    if (this.sceneProperties) {
      this.sceneProperties.destroy(true);
      this.sceneProperties = undefined;
    }
  }

  refreshScenePropertiesPanel(position?: XY): void {
    this.removeScenePropertiesPanel();
    if (!position) {
      return;
    }
    this.sceneProperties = new ScenePropertiesPanel(
      this,
      position.x,
      position.y,
      {
        onChange: () => {
          this.queueSceneStateChange();
        },
        onEnter: () => {
          this.queueSceneStateChange();
          this.reloadScene(true);
          this.queueSceneStateChange();
        },
      },
    );
    this.hudContainer.add(this.sceneProperties);
  }

  toggleScenePropertiesPanel(): void {
    if (this.sceneProperties) {
      this.sceneProperties.destroy(true);
      this.sceneProperties = undefined;
    } else {
      this.refreshScenePropertiesPanel(this.getMenuPosition());
    }
    if (this.propertiesPanel) {
      this.refreshEntityPropertiesPanel(this.getMenuPosition());
    }
  }

  toggleEntityPicker(): void {
    // This method can be expanded to show a UI for picking entities to add to the scene.
    // For now, it just creates a new entity at the origin and selects it.
    const boxData: EntityState | any = {
      name: `Entity${Math.floor(Math.random() * 1000)}`,
      entityType: "RoundedBox",
      components: [],
      userData: {
        radius: 0.075,
        segments: 5,
        width: 1,
        height: 1,
        depth: 1,
        material: {
          color: 0x008bff,
          metalness: 0.25,
          roughness: 0.25,
        },
        physicsData: {
          mass: 100,
          friction: 0.5,
          density: 1,
          restitution: 0.001,
        },
        transform: {
          position: new THREE.Vector3(0, 1, 0),
          rotation: new THREE.Euler(),
          quaternion: new THREE.Quaternion(),
          scale: new THREE.Vector3(1, 1, 1),
        },
      },
    };
    createAddEntities(this.threeScene, [boxData]);
  }

  removeEntityBuilder(): void {
    if (this.entityBuilder) {
      this.entityBuilder.destroy();
      this.entityBuilder = undefined;
    }
  }

  toggleEntityBuilder(): void {
    if (this.entityBuilder || !this.selected) {
      return;
    }
    this.clearGizmo();
    this.removeScenePropertiesPanel();
    this.removeEntityPropertiesPanel();
    const builder = new EntityBuilderPanel(this, 50, 50);
    this.entityBuilder = builder;
    this.hudContainer.add(builder);
  }
}
