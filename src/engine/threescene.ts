import * as THREE from "three";
import { AudioManager } from "./audio";
import { CollisionManager } from "./collision";
import { GameplayTag, Tween, UpdateArgs, ThreeSceneState, XY, CollisionCallback, UserProfile, WebWorkerPayload, WebWorkerResponse, XYZ } from "./types";
import { Entity } from "./entity";
import { MultiplayerManager } from "./multiplayer";
import { Physics, CharacterController, PhysicsCollisionData } from "./physics";
import { PostProcess } from "./postprocess";
import { WeatherManager } from "./weather";
import { WebWorkerManager, WebWorkerHandle } from "./webworker";

/** ThreeScene interface */
export interface ThreeScene {
  // Logging
  log(message: any, ...optionalParams: any[]): void;

  // Input management
  addKey(key: string): Phaser.Input.Keyboard.Key | undefined;

  // Entity management
  addEntity(entity: Entity): void;
  removeEntity(entity: Entity): void;

  // Entity querying
  findEntityByName(name: string): Entity | undefined;
  findEntitiesByEntityType(entityType: string): Entity[];
  findEntitiesByTag(tag: string): Entity[];
  findEntitiesByGameplayTag(tag: GameplayTag): Entity[];

  // Setters
  setPaused(paused: boolean): void;
  setKillY(killY: number): void;
  setFov(fov: number): void;

  // Getters
  getPaused(): boolean;
  getKillY(): number;
  getPhaserScene(): Phaser.Scene;
  getEntities(): Set<Entity>;
  getAllEntities(): Entity[];
  getCamera(): THREE.PerspectiveCamera;
  getPostProcess(): PostProcess;
  getWeatherManager(): WeatherManager;
  getAudioManager(): AudioManager;
  getCollisionManager(): CollisionManager;
  getMultiplayerManager(): MultiplayerManager;
  getPhysics(): Physics;
  getWebWorkerManager(): WebWorkerManager;

  // Tween management
  addTween(tween: Tween): void;
  removeTween(tween: Tween): void;
  isTweening(target: any): boolean;

  // Lifecycle and state management
  togglePause(): void;
  update(args: UpdateArgs): void;
  dispose(): void;

  // Save/load management
  saveSceneState(): ThreeSceneState;
  loadSceneState(state: ThreeSceneState): void;
  loadSceneFromFile(filename: string, onLoaded?: () => void): Promise<void>;
  saveSceneToFile(filename: string): void;

  // Camera management
  refreshMatrixWorld(): THREE.PerspectiveCamera;
  raycastFromCamera(mousePos: XY, filterFunc?: (obj: THREE.Object3D) => boolean): THREE.Intersection[]
  raycastFromCameraCenter(filterFunc?: (obj: THREE.Object3D) => boolean): THREE.Intersection[]

  // Post-processing management
  setOutlineSelectedObjects(name: string, selectedObjects: THREE.Object3D[]): void;

  // Weather management
  getTimeOfDay(): number;
  setTimeOfDay(timeOfDay: number): void;
  getFogDensity(): number;
  setFogDensity(density: number): void;

  // Audio management
  loadSounds(keys: string[], loop?: boolean, volume?: number): void;
  playSound(key: string, pitchShift?: boolean, pitchShiftRange?: number): void;
  playSound3D(key: string, target: THREE.Vector3 | THREE.Object3D, pitchShift?: boolean, pitchShiftRange?: number): void;
  stopSound(key: string): void;
  playMusic(key: string, fadeDuration?: number): void;
  stopMusic(fadeDuration?: number): void;
  setVolume(key: string, volume: number): void;

  // Collision management
  addCollider(collider: CollisionCallback | CollisionCallback[]): void;
  removeCollider(colliderName: string): void;

  // Multiplayer management
  connect(userProfile: UserProfile): void;
  on(event: string, callback: (data: any) => void): void;
  emit(event: string, data: any): void;

  // Physics management
  togglePhysics(override?: boolean): void;
  addPhysicsObject(entity: Entity): void;
  removePhysicsObject(entity: Entity): void;
  addImpulse(entity: Entity, impulse: THREE.Vector3, strength: number, index?: number): void;
  addImpulseAtPoint(point: THREE.Vector3, strength: number, range: number): void;
  createCharacterController(gap?: number): CharacterController;
  removeCharacterController(controller: CharacterController): void;
  getEntityFromColliderHandle(handle: number): Entity | undefined;
  entityCollision(entityA: Entity, entityB: Entity, started: boolean): void;
  setBodyCollisionData(entity: Entity, data: PhysicsCollisionData): void;
  setGravity(gravity: XYZ): void;

  // WebWorker management
  createWebWorker(taskName: string, workerUrl?: string): WebWorkerHandle;
  runWebWorkerTask(handle: WebWorkerHandle, payload: WebWorkerPayload, callback: (response: WebWorkerResponse) => void): void;
  asyncRunWebWorkerTask(handle: WebWorkerHandle, payload: WebWorkerPayload): Promise<WebWorkerResponse>;

  // Speech management
  startSpeechRecognition(): void;
  stopSpeechRecognition(): void;
  speak(text: string): void;
  getSpeechTranscriptHistory(): string[];
  getRecentSpeechTranscript(): string;
}