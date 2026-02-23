import * as THREE from 'three';
import { Capsule, Octree } from 'three/examples/jsm/Addons.js';
import { IUniform } from 'three';
import { RigidBody } from '@dimforge/rapier3d-compat';
import { Collider } from '@dimforge/rapier3d-compat';
import { PhysicsBodyData } from './physics';
import { Entity } from './entity';
import { SpeechState } from './speech';

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

export const UP_AXIS = new THREE.Vector3(0, 1, 0);
export const DOWN_AXIS = new THREE.Vector3(0, -1, 0);
export const LEFT_AXIS = new THREE.Vector3(-1, 0, 0);
export const RIGHT_AXIS = new THREE.Vector3(1, 0, 0);
export const FORWARD_AXIS = new THREE.Vector3(0, 0, -1);
export const BACKWARD_AXIS = new THREE.Vector3(0, 0, 1);

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
  quaternion: THREE.Quaternion;
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
  wireframe?: boolean;
  depthWrite?: boolean;
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
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
  fogDensity: number;
}

/** Game scene state interface for saving/loading */
export interface ThreeSceneState {
  paused: boolean;
  weather: WeatherState;
  camera: CameraState;
  physics: PhysicsState;
  speech: SpeechState;
  entities: EntityState[];
}

/** Options for creating a game scene */
export interface ThreeSceneOptions {
  fov?: number;
  near?: number;
  far?: number;
  physicsState?: PhysicsState;
  killY?: number;
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

/** Shader interface for custom shader passes in post-processing */
export interface Shader {
  uniforms: { [uniform: string]: IUniform<any> };
  vertexShader: string;
  fragmentShader: string;
  transparent?: boolean;
  depthWrite?: boolean;
}

/** Collider interface for handling collisions between things */
export interface CollisionCallback {
  name: string;
  entitiesA: Set<Entity>;
  entitiesB: Set<Entity>;
  onCollision: (entityA: Entity, entityB: Entity) => void; // Callback when a bounding box collision is detected
}

