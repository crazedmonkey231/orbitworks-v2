import * as THREE from "three";
import {
  GameplayTag,
  EntityComponentState,
  UserData,
  Transform,
  PhysicsData,
  MaterialData,
  UpdateArgs,
  EntityState,
} from "./types";
import { PhysicsBodyData } from "./physics";
import { ThreeSceneBase } from "./threescenebase";
import { EntityComponent } from "./entitycomp";

/** Main entity interface */
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
  getThreeScene(): ThreeSceneBase;
  getObject3D(): THREE.Object3D;
  getAsMesh(): THREE.Mesh | undefined;
  getName(): string;
  getEntityType(): string;
  getAlive(): boolean;
  getTags(): Set<string>;
  getGameplayTags(): Set<GameplayTag>;
  getComponents(): EntityComponent[];
  getUserData(): UserData;
  getPhysicsData(): PhysicsData;
  getPhysicsBodyData(): PhysicsBodyData;
  getMaterialData(): MaterialData;
  getTransform(): Transform;
  getWorldTransform(): Transform;
  getColliderHandle(): number[];

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
  collide(otherEntity: Entity, started: boolean): void;
  damage(amount: number, sourceEntity?: Entity): void;
  update(args: UpdateArgs): void;
  kill(): void;

  // State management for saving/loading
  saveState(): EntityState;
  loadState(state: EntityState): void;
}
