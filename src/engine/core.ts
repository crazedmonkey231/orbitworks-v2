// Core types and interfaces for the game engine, including entities, components, and gameplay tags.
import * as THREE from 'three';
import { Capsule, Octree } from 'three/examples/jsm/Addons.js';
import { IUniform } from 'three';
import { RigidBody } from '@dimforge/rapier3d-compat';
import { Collider } from '@dimforge/rapier3d-compat';
import { ThreeSceneBase } from './threescenebase';
import { Physics, PhysicsBodyData } from './physics';
import { MultiplayerManager } from './multiplayer';
import { CollisionManager } from './collision';
import { AudioManager } from './audio';
import { WeatherManager } from './weather';
import { PostProcess } from './postprocess';
import { WebWorkerHandle, WebWorkerManager } from './webworker';

/** Base URL for asset loading */
export const BASE_URL = import.meta.env.BASE_URL || "./";

/** Type representing all possible gameplay tags */
export type GameplayTag = typeof GameplayTags[keyof typeof GameplayTags];

/** Supported non-physics collider shapes */
export type ColliderShape = THREE.Box3 | THREE.Sphere | Capsule;

/** Tween type representing various Phaser tween configurations and instances */
export type Tween = Phaser.Types.Tweens.TweenBuilderConfig | Phaser.Types.Tweens.TweenChainBuilderConfig | Phaser.Tweens.Tween | Phaser.Tweens.TweenChain;

/** A physics body, which can be a RigidBody or null if not yet created */
export type PhysicsBody = RigidBody | null;

/** A physics collider, which can be a Collider or null if not yet created */
export type PhysicsCollider = Collider | null;

/** 
 * Gameplay tag collection for entities. 
 * Use the type GameplayTag for type safety.
 */
export const GameplayTags = {
  Player: 'player',
  Enemy: 'enemy',
  NPC: 'npc',
  Collectible: 'collectible',
  Obstacle: 'obstacle',
  Interactive: 'interactive',
  Projectile: 'projectile',
  Ally: 'ally',
  Boss: 'boss',
  Environment: 'environment',
} as const;

/** Type representing a 2D vector with x, y components */
export interface XY {
  x: number;
  y: number;
}

/** Type representing a 3D vector with x, y, z components */
export interface XYZ {
  x: number;
  y: number;
  z: number;
}

/** Transform interface */
export interface Transform {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

/** Material data interface for defining material properties of entities */
export interface MaterialData {
  color?: number;
  metalness?: number;
  roughness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  opacity?: number;
  transparent?: boolean;
  depthWrite?: boolean;
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  wireframe?: boolean;
  [key: string]: any; // Allow additional material properties
}

/** Arguments passed to the update method of entities and components */
export interface UpdateArgs {
  time: number;
  deltaTime: number;
  octree?: Octree;
  [key: string]: any; // Allow additional dynamic properties
}

/** State interface for entity components with dynamic properties */
export interface EntityComponentState {
  name: string;
  compType: string;
  [key: string]: any;
}

/** Entity component interface */
export interface EntityComponent {
  // Setters for core properties
  setName(name: string): void;
  setEntity(entity: Entity): void;

  // Getters
  getName(): string;
  getEntity(): Entity | undefined;

  // Helpers
  isNameEqual(name: string): boolean;

  // Lifecycle methods
  update(args: UpdateArgs): void;
  dispose(): void; // Cleans up resources but does not remove itself from the entity
  removeFromEntity(): void;

  // State management for saving/loading
  saveState(): EntityComponentState;
  loadState(state: EntityComponentState): void;
}

/** Collider component interface */
export interface ColliderComponent extends EntityComponent {
  shape: ColliderShape;
  syncCollider(): void;
  resolveCollision(other: ColliderComponent): void;
  resolveOctreeCollision(octree: Octree): void;
}

/** PhysicsData defines the properties for physics-enabled objects, such as mass and restitution (bounciness). */
export interface PhysicsData {
  mass?: number;
  friction?: number;
  density?: number;
  restitution?: number;
}

/** Type for user-defined data attached to entities */
export interface UserData {
  transform?: Transform;
  physicsData?: PhysicsData;
  physics?: PhysicsBodyData;
  material?: MaterialData;
  [key: string]: any;
}

/** Entity interface */
export interface Entity {
  // Basic setters for core properties
  setScene(scene: ThreeSceneBase): void;
  setObject3D(object3D: THREE.Object3D): void;
  setEntityType(type: string): void;
  setAlive(alive: boolean): void;
  setTags(tags: string[]): void;
  setGameplayTags(gameplayTags: GameplayTag[]): void;
  setComponents(components: EntityComponentState[]): void;
  setUserData(userData: UserData): void;
  setName(name: string): void;
  setTransform(transform: Transform): void;
  setPhysicsBodyData(physicsBodyData?: PhysicsBodyData): void;

  // Getters
  getGameScene(): ThreeSceneBase;
  getObject3D(): THREE.Object3D;
  getAsMesh(): THREE.Mesh | undefined;
  getEntityType(): string;
  getAlive(): boolean;
  getTags(): Set<string>;
  getGameplayTags(): Set<GameplayTag>;
  getComponents(): EntityComponent[];
  getUserData(): UserData;
  getPhysicsData(): PhysicsData | undefined;
  getPhysicsBodyData(): PhysicsBodyData | undefined;
  getMaterialData(): MaterialData | undefined;
  getTransform(): Transform;

  // Tag management
  addTag(tag: string): void;
  removeTag(tag: string): void;
  hasTag(tag: string): boolean;
  addGameplayTag(tag: GameplayTag): void;
  removeGameplayTag(tag: GameplayTag): void;
  hasGameplayTag(tag: GameplayTag): boolean;

  // Component management
  addComponent(component: EntityComponent): void;
  removeComponent(componentName: string): void;
  removeAllComponents(): void;
  getComponent<T extends EntityComponent>(componentName: string): T | undefined;
  hasComponent(componentName: string): boolean;

  // Attachment management
  attachObject3D(object3D: THREE.Object3D): void;
  detachObject3D(object3D: THREE.Object3D): void;
  
  // Lifecycle methods
  update(args: UpdateArgs): void;
  kill(): void;
  
  // State management for saving/loading
  saveState(): EntityState;
  loadState(state: EntityState): void;
}

/** Entity state interface for saving/loading */
export interface EntityState {
  name: string;
  entityType: string;
  tags: string[];
  gameplayTags: GameplayTag[];
  components: EntityComponentState[];
  userData: UserData;
}

/** A snapshot of the camera's state for saving/loading */
export interface CameraState {
  fov: number;
  near: number;
  far: number;
  transform: Transform;
}

/** Physics state interface for saving/loading */
export interface PhysicsState {
  enabled: boolean;
  helper: boolean;
  gravity?: XYZ;
}

/** Weather state interface for saving/loading */
export interface WeatherState {
  enabled: boolean;
  timeOfDay: number;
}

/** Game scene state interface for saving/loading */
export interface GameSceneState {
  paused: boolean;
  weather: WeatherState;
  camera: CameraState;
  entities: EntityState[];
  physics: PhysicsState;
}

/** Options for creating a game scene */
export interface GameSceneOptions {
  fov?: number;
  near?: number;
  far?: number;
  physicsState?: PhysicsState;
  killY?: number; // Y position below which entities will be automatically killed
}

/** Player data interface for multiplayer connections */
export interface UserProfile {
  name: string;
  transform?: Transform;
  userData?: UserData;
}

/** 
 * Interface for a web worker task request.
 * All requests have a default message property for simple tasks, but can be extended with additional properties as needed.
 */
export interface WebWorkerPayload {
  message: any;
  [key: string]: any;
}

/** 
 * Interface for a web worker task response.
 * All responses have a result property for simple tasks, but can be extended with additional properties as needed.
 */
export interface WebWorkerResponse {
  result: any;
  [key: string]: any;
}

/** Game scene interface */
export interface GameScene {
  // Logging
  log(message: any, ...optionalParams: any[]): void;

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
  update(args: UpdateArgs): void;
  dispose(): void;

  // Save/load management
  saveSceneState(): GameSceneState;
  loadSceneState(state: GameSceneState): void;
  loadSceneFromFile(filename: string, onLoaded?: () => void): Promise<void>;
  saveSceneToFile(filename: string): void;

  // Camera management
  refreshMatrixWorld(): THREE.PerspectiveCamera;
  raycastFromCamera(mousePos: XY, filterFunc?: (obj: THREE.Object3D) => boolean): THREE.Intersection[]
  raycastFromCameraCenter(filterFunc?: (obj: THREE.Object3D) => boolean): THREE.Intersection[]

  // Post-processing management
  setOutlineSelectedObjects(name: string, selectedObjects: THREE.Object3D[]): void;

  // Weather management
  setTimeOfDay(timeOfDay: number): void;

  // Audio management
  loadSounds(keys: string[], loop?: boolean, volume?: number): void;
  playSound(key: string, pitchShift?: boolean, pitchShiftRange?: number): void;
  playSound3D(key: string, target: THREE.Vector3 | THREE.Object3D, pitchShift?: boolean, pitchShiftRange?: number): void;
  stopSound(key: string): void;
  playMusic(key: string, fadeDuration?: number): void;
  stopMusic(fadeDuration?: number): void;
  setVolume(key: string, volume: number): void;

  // Collision management
  addCollider(collider: ICollisionHandler | ICollisionHandler[]): void;
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
  addImpulseAtPoint(impulse: THREE.Vector3, point: THREE.Vector3, strength: number, range: number): void;

  // WebWorker management
  createWebWorker(taskName: string, workerUrl?: string): WebWorkerHandle;
  runWebWorkerTask(handle: WebWorkerHandle, payload: WebWorkerPayload, callback: (response: WebWorkerResponse) => void): void;
  asyncRunWebWorkerTask(handle: WebWorkerHandle, payload: WebWorkerPayload): Promise<WebWorkerResponse>;
}

/** Shader interface for custom shader passes in post-processing */
export interface Shader {
  uniforms: { [uniform: string]: IUniform<any> };
  vertexShader: string;
  fragmentShader: string;
  transparent?: boolean;
  depthWrite?: boolean;
}

/** Collider interface for handling collisions between things */
export interface ICollisionHandler {
  name: string;
  entitiesA: Set<Entity>;
  entitiesB: Set<Entity>;
  onCollision: (entityA: Entity, entityB: Entity) => void; // Callback when a bounding box collision is detected
}

