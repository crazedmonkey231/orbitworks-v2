import * as THREE from "three";
import {
  Entity,
  GameScene,
  UpdateArgs,
  GameSceneState,
  GameSceneOptions,
  Tween,
  GameplayTag,
  UserProfile,
  WebWorkerResponse,
  WebWorkerPayload,
  ICollisionHandler,
  XY,
} from "./core";
import { EntityFactory } from "./entityfactory";
import { renderer, resizeThree } from "./game";
import { PostProcess } from "./postprocess";
import { WeatherManager } from "./weather";
import { AudioManager } from "./audio";
import { CollisionManager } from "./collision";
import { MultiplayerManager } from "./multiplayer";
import { Physics } from "./physics";
import { WebWorkerHandle, WebWorkerManager } from "./webworker";
import { LevelPath } from "./paths";

/**
 * ThreeSceneBase is an abstract base class for game scenes that use Three.js for rendering.
 * It implements the GameScene interface and provides common functionality for:
 *  - managing entities
 *  - camera
 *  - post-processing effects
 *  - weather
 *  - audio (2D and 3D)
 *  - physics
 *  - non-physics based collision
 *  - multiplayer features
 *  - web worker management
 *
 * Subclasses must implement the onUpdate and onDispose methods to define specific behavior and cleanup for each scene.
 */
export abstract class ThreeSceneBase extends THREE.Scene implements GameScene {
  private paused: boolean = false;
  private killY: number;
  private phaserScene: Phaser.Scene;
  private entities: Set<Entity> = new Set<Entity>();
  private camera: THREE.PerspectiveCamera;
  private postprocess: PostProcess;
  private weather: WeatherManager;
  private audio: AudioManager;
  private collision: CollisionManager;
  private multiplayer: MultiplayerManager;
  private physics: Physics;
  private webWorker: WebWorkerManager;
  private raycaster: THREE.Raycaster;
  private tmpVec2: THREE.Vector2 = new THREE.Vector2();

  constructor(phaserScene: Phaser.Scene, options?: GameSceneOptions) {
    super();
    this.phaserScene = phaserScene;
    this.killY = options?.killY ?? -10;

    this.camera = new THREE.PerspectiveCamera(
      options?.fov ?? 75,
      window.innerWidth / window.innerHeight,
      options?.near ?? 0.1,
      options?.far ?? 1000,
    );
    this.add(this.camera);

    this.postprocess = new PostProcess(renderer, this, this.camera);
    this.weather = new WeatherManager(this);
    this.audio = new AudioManager(this.camera);
    this.collision = new CollisionManager();
    this.multiplayer = new MultiplayerManager();
    this.physics = new Physics(
      this,
      options?.physicsState ?? { enabled: true, helper: false },
    );
    this.webWorker = new WebWorkerManager();
    this.raycaster = new THREE.Raycaster();

    // Handle window resize
    window.addEventListener("resize", () => resizeThree(this.camera));
    resizeThree(this.camera);

    // Ensure proper cleanup when the page is closed or refreshed
    window.addEventListener("beforeunload", () => {
      this.dispose();
    });
  }

  // Logging

  log(message: any, ...optionalParams: any[]): void {
    console.log(`[${this.constructor.name}]`, message, ...optionalParams);
  }

  // Entity management

  addEntity(entity: Entity, isPhysicsObject: boolean = false): void {
    this.entities.add(entity);
    this.add(entity.getObject3D());
    entity.setScene(this);
    if (isPhysicsObject) {
      this.addPhysicsObject(entity);
    }
  }

  removeEntity(entity: Entity, kill: boolean = true): void {
    if (this.entities.has(entity)) {
      this.remove(entity.getObject3D());
      this.removePhysicsObject(entity);
      this.entities.delete(entity);
      if (kill) {
        entity.kill();
      }
    }
  }

  // Entity querying

  findEntityByName(name: string): Entity | undefined {
    return this.getObjectByName(name)?.userData.entity as Entity | undefined; 
  }

  findEntitiesByEntityType(entityType: string): Entity[] {
    return Array.from(this.entities).filter(
      (entity) => entity.getEntityType() === entityType,
    );
  }

  findEntitiesByTag(tag: string): Entity[] {
    return Array.from(this.entities).filter((entity) => entity.hasTag(tag));
  }

  findEntitiesByGameplayTag(tag: GameplayTag): Entity[] {
    return Array.from(this.entities).filter((entity) =>
      entity.hasGameplayTag(tag),
    );
  }

  // Setters

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setKillY(killY: number): void {
    this.killY = killY;
  }

  setFov(fov: number): void {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  // Getters

  getPaused(): boolean {
    return this.paused;
  }

  getKillY(): number {
    return this.killY;
  }

  getPhaserScene(): Phaser.Scene {
    return this.phaserScene;
  }

  getEntities(): Set<Entity> {
    return this.entities;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getPostProcess(): PostProcess {
    return this.postprocess;
  }

  getWeatherManager(): WeatherManager {
    return this.weather;
  }

  getAudioManager(): AudioManager {
    return this.audio;
  }

  getCollisionManager(): CollisionManager {
    return this.collision;
  }

  getMultiplayerManager(): MultiplayerManager {
    return this.multiplayer;
  }

  getPhysics(): Physics {
    return this.physics;
  }

  getWebWorkerManager(): WebWorkerManager {
    return this.webWorker;
  }

  // Tween management

  addTween(tween: Tween): void {
    this.phaserScene.tweens.add(tween);
  }

  removeTween(tween: Tween): void {
    tween.stop();
  }

  isTweening(target: any): boolean {
    return this.phaserScene.tweens.isTweening(target);
  }

  // Lifecycle and state management

  /** Optional method for logic that should run before the main update loop, such as input handling or pre-update calculations */
  preUpdate?(args: UpdateArgs): void;

  /** Abstract method that must be implemented by subclasses to define the main update logic for the scene */
  abstract onUpdate(args: UpdateArgs): void;

  /** Optional method for logic that should run after the main update loop, such as cleanup or late updates */
  postUpdate?(args: UpdateArgs): void;

  update(args: UpdateArgs): void {
    if (!this.paused) {
      this.preUpdate?.(args);
      this.physics.update(args);
      this.weather.update(args);
      this.collision.update(args);
      this.audio.update(args);
      for (const entity of this.entities) {
        this.physics.syncEntity(entity);
        entity.update(args);
        if (entity.getObject3D().position.y < this.killY) {
          this.removeEntity(entity);
        }
      }
      this.onUpdate(args);
      this.postUpdate?.(args);
    }
    this.postprocess.render();
  }

  /** Abstract method that must be implemented by subclasses to define the disposal logic for the scene */
  abstract onDispose(): void;

  dispose(): void {
    this.multiplayer.dispose();
    this.onDispose();
    for (const entity of this.entities) {
      this.removeEntity(entity);
    }
    this.entities.clear();
    this.log("Disposed entities");
    for (const key in this) {
      //@ts-ignore
      if (typeof this[key]?.dispose === "function") {
        //@ts-ignore
        this[key].dispose();
        this.log(`Disposed ${key}`);
      }
    }
  }

  // Save/load management

  saveSceneState(): GameSceneState {
    const state: GameSceneState = {
      paused: this.paused,
      camera: {
        fov: this.camera.fov,
        near: this.camera.near,
        far: this.camera.far,
        transform: {
          position: this.camera.position.clone(),
          rotation: this.camera.rotation.clone(),
          scale: this.camera.scale.clone(),
        },
      },
      weather: this.weather.saveState(),
      entities: Array.from(this.entities).map((entity) => entity.saveState()),
      physics: this.physics.saveState(),
    };
    return state;
  }

  loadSceneState(state: GameSceneState): void {
    if (this.entities.size > 0) {
      for (const entity of this.entities) {
        this.removeEntity(entity);
      }
    }

    // Load paused state
    this.paused = state.paused;

    // Load camera state
    const cameraState = state.camera;
    this.camera.fov = cameraState.fov;
    this.camera.near = cameraState.near;
    this.camera.far = cameraState.far;
    this.camera.position.copy(cameraState.transform.position);
    this.camera.rotation.copy(cameraState.transform.rotation);
    this.camera.scale.copy(cameraState.transform.scale);
    this.camera.updateProjectionMatrix();

    // Load weather state
    this.weather.loadState(state.weather);

    // Load entities
    EntityFactory.createAddEntities(this, state.entities);

    // Load physics state
    this.physics.loadState(state.physics);
  }

  async loadSceneFromFile(filename: string, onLoaded?: () => void): Promise<void> {
    const filePath = `${LevelPath(filename)}.json`;
    const response = await fetch(filePath);
    const json = await response.json();
    const jsonObj = typeof json === "string" ? JSON.parse(json) : json;
    this.loadSceneState(jsonObj);
    if (onLoaded) onLoaded();
    console.log(`Loaded scene from ${filePath}`);
  }

  async saveSceneToFile(filename: string): Promise<void> {
    const sceneState = this.saveSceneState();
    const jsonString = JSON.stringify(sceneState, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${LevelPath(filename)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`Saved scene to ${LevelPath(filename)}.json`);
  }

  // Camera management

  refreshMatrixWorld(): THREE.PerspectiveCamera {
    this.camera.updateMatrixWorld();
    return this.camera;
  }

  raycastFromCamera(mousePos: XY, filterFunc?: (obj: THREE.Object3D) => boolean): THREE.Intersection[] {
    this.tmpVec2.x = (mousePos.x / window.innerWidth) * 2 - 1;
    this.tmpVec2.y = -(mousePos.y / window.innerHeight) * 2 + 1;
    const camera = this.refreshMatrixWorld(); // Ensure camera matrices are up to date
    this.raycaster.setFromCamera(this.tmpVec2, camera);
    if (!filterFunc) {
      filterFunc = (obj) => obj.visible && obj.userData.entity;
    }
    const filteredObjects = this.children.filter(filterFunc);
    return this.raycaster.intersectObjects(filteredObjects, true);
  }

  raycastFromCameraCenter(filterFunc?: (obj: THREE.Object3D) => boolean): THREE.Intersection[] {
    const camera = this.refreshMatrixWorld();
    this.tmpVec2.set(0, 0);
    this.raycaster.setFromCamera(this.tmpVec2, camera);
    if (!filterFunc) {
      filterFunc = (obj) => obj.visible && obj.userData.entity;
    }
    const filteredObjects = this.children.filter(filterFunc);
    return this.raycaster.intersectObjects(filteredObjects, true);
  }

  // Post-processing management

  setOutlineSelectedObjects(
    name: string,
    selectedObjects: THREE.Object3D[],
  ): void {
    this.postprocess.setOutlineSelectedObjects(name, selectedObjects);
  }

  // Weather management

  setTimeOfDay(timeOfDay: number): void {
    this.weather.setTimeOfDay(timeOfDay);
  }

  // Audio management

  loadSounds(keys: string[], loop: boolean = false, volume: number = 1.0): void {
    this.audio.loadSounds(keys, loop, volume);
  }

  playSound(key: string, pitchShift: boolean = true, pitchShiftRange: number = 0.3): void {
    this.audio.playSound(key, pitchShift, pitchShiftRange);
  }

  playSound3D(key: string, target: THREE.Vector3 | THREE.Object3D, pitchShift?: boolean, pitchShiftRange?: number): void {
    this.audio.playSound3D(key, target, pitchShift, pitchShiftRange);
  }

  stopSound(key: string): void {
    this.audio.stopSound(key);
  }

  playMusic(key: string, fadeDuration?: number): void {
    this.audio.playMusic(key, fadeDuration);
  }

  stopMusic(fadeDuration: number = 2000): void {
    this.audio.stopMusic(fadeDuration);
  }

  setVolume(key: string, volume: number): void {
    this.audio.setVolume(key, volume);
  }

  // Collision management
  
  addCollider(collider: ICollisionHandler | ICollisionHandler[]) {
    this.collision.add(collider);
  }

  removeCollider(colliderName: string) {
    this.collision.remove(colliderName);
  }

  // Multiplayer management

  connect(userProfile: UserProfile): void {
    this.multiplayer.connect(userProfile);
  }

  on(event: string, callback: (data: any) => void): void {
    this.multiplayer.on(event, callback);
  }

  emit(event: string, data: any): void {
    this.multiplayer.emit(event, data);
  }

  // Physics management

  togglePhysics(override?: boolean): void {
    this.physics.toggleEnabled(override);
  }

  addPhysicsObject(entity: Entity): void {
    this.physics.addEntity(entity);
  }

  removePhysicsObject(entity: Entity): void {
    this.physics.removeEntity(entity);
  }

  addImpulse(
    entity: Entity,
    impulse: THREE.Vector3,
    strength: number,
    index?: number,
  ): void {
    this.physics.addImpulse(entity, impulse, strength, index);
  }

  addImpulseAtPoint(
    impulse: THREE.Vector3,
    point: THREE.Vector3,
    strength: number = 1,
    range: number = 5,
  ): void {
    this.physics.addImpulseAtPoint(impulse, point, strength, range);
  }

  // WebWorker management

  createWebWorker(taskName: string, workerUrl?: string): WebWorkerHandle {
    return this.webWorker.createWorker(taskName, workerUrl);
  }

  runWebWorkerTask(
    handle: WebWorkerHandle,
    payload: WebWorkerPayload,
    callback: (response: WebWorkerResponse) => void,
  ): void {
    handle
      .run(payload)
      .then((value) => {
        callback(value as WebWorkerResponse);
      })
      .catch((error) => {
        console.error(`Error running web worker task ${handle.id}:`, error);
      });
  }

  async asyncRunWebWorkerTask(
    handle: WebWorkerHandle,
    payload: WebWorkerPayload,
  ): Promise<WebWorkerResponse> {
    return await handle.run<WebWorkerPayload, WebWorkerResponse>(payload);
  }
}
