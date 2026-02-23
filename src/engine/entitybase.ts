import * as THREE from "three";
import { disposeObject3D } from "./utils.js";
import {
  EntityComponentState,
  EntityState,
  GameplayTag,
  MaterialData,
  PhysicsData,
  Transform,
  UpdateArgs,
  UserData,
} from "./shared.js";
import { ThreeSceneBase } from "./threescenebase.js";
import { createComponentsFromStates } from "./entitycompfactory.js";
import { PhysicsBodyData } from "./physics.js";
import { Entity } from "./entity.js";
import { EntityComponent } from "./entitycomp.js";

/**
 * Abstract base class for entities.
 * This class provides common functionality for all entities, such as managing tags, components, and user data.
 * It also defines the basic lifecycle methods like update and kill.
 * Subclasses must implement the createObject3D method to define their visual representation and the onUpdate method for custom update logic.
 */
export abstract class EntityBase implements Entity {
  private threeScene!: ThreeSceneBase;
  private object3D: THREE.Object3D;
  private entityType: string = "Box";
  private alive: boolean = false;
  private tags: Set<string> = new Set<string>();
  private gameplayTags: Set<GameplayTag> = new Set<GameplayTag>();
  private components: EntityComponent[] = [];
  private userData: UserData = {};
  private worldPosition: THREE.Vector3 = new THREE.Vector3();
  private worldScale: THREE.Vector3 = new THREE.Vector3();
  private worldQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private rotation: THREE.Euler = new THREE.Euler();
  private bounds: THREE.Box3 = new THREE.Box3();

  constructor(threeScene: ThreeSceneBase, entityState: EntityState) {
    this.setScene(threeScene);
    this.object3D = this.createObject3D(entityState);
    this.object3D.userData.entity = this; // Link back to the entity
    this.loadState(entityState);
  }

  /** Subclasses must implement this to define their visual representation */
  abstract createObject3D(entityState: EntityState): THREE.Object3D;

  // Basic setters for core properties

  setScene(scene: ThreeSceneBase): void {
    this.threeScene = scene;
  }

  setObject3D(object3D: THREE.Object3D): void {
    this.object3D = object3D;
    this.object3D.userData.entity = this; // Link back to the entity
  }

  setEntityType(type: string): void {
    this.entityType = type;
  }

  setAlive(alive: boolean): void {
    this.alive = alive;
    this.object3D.visible = alive;
  }

  setTags(tags: string[]): void {
    this.tags = new Set<string>(tags || []);
  }

  setGameplayTags(gameplayTags: GameplayTag[]): void {
    this.gameplayTags = new Set<GameplayTag>(gameplayTags || []);
  }

  setComponents(components: EntityComponentState[]): void {
    this.components = createComponentsFromStates(this, components || []);
  }

  setUserData(userData: UserData): void {
    this.userData = userData || {};
  }

  setName(name: string): void {
    this.object3D.name = name || "Entity";
  }

  setTransform(transform: Transform): void {
    this.object3D.position.copy(transform.position);
    this.object3D.quaternion.copy(transform.quaternion);
    this.rotation.copy(transform.rotation);
    this.object3D.scale.copy(transform.scale);
  }

  setPhysicsBodyData(physicsBodyData?: PhysicsBodyData): void {
    if (!physicsBodyData) {
      if (this.userData.physics) {
        delete this.userData.physics;
      }
      return;
    }
    this.userData.physics = physicsBodyData;
  }

  // Getters

  getThreeScene(): ThreeSceneBase {
    return this.threeScene;
  }

  getObject3D(): THREE.Object3D {
    return this.object3D;
  }

  getAsMesh(): THREE.Mesh | undefined {
    return this.object3D as THREE.Mesh;
  }

  getName(): string {
    return this.object3D.name;
  }

  getEntityType(): string {
    return this.entityType;
  }

  getAlive(): boolean {
    return this.alive || false;
  }

  getTags(): Set<string> {
    return this.tags;
  }

  getGameplayTags(): Set<GameplayTag> {
    return this.gameplayTags;
  }

  getComponents(): EntityComponent[] {
    return this.components;
  }

  getUserData(): UserData {
    return this.userData;
  }

  getPhysicsData(): PhysicsData {
    return this.userData.physicsData || {} as PhysicsData;
  }

  getPhysicsBodyData(): PhysicsBodyData {
    return this.userData.physics || {
      body: undefined,
      collider: undefined,
    } as PhysicsBodyData;
  }

  getMaterialData(): MaterialData {
    return this.userData.material || {};
  }

  getTransform(): Transform {
    return {
      position: this.object3D.position.clone(),
      quaternion: this.object3D.quaternion.clone(),
      rotation: this.rotation.setFromQuaternion(this.object3D.quaternion),
      scale: this.object3D.scale.clone(),
    };
  }

  getWorldTransform(): Transform {
    this.object3D.updateMatrixWorld(true);
    this.object3D.getWorldPosition(this.worldPosition);
    this.object3D.getWorldQuaternion(this.worldQuaternion);
    this.object3D.getWorldScale(this.worldScale);
    return {
      position: this.worldPosition,
      quaternion: this.worldQuaternion,
      rotation: this.rotation.setFromQuaternion(this.worldQuaternion),
      scale: this.worldScale,
    };
  }

  getColliderHandle(): number[] {
    const physicsBodyData = this.getPhysicsBodyData();
    if (physicsBodyData.collider) {
      if (Array.isArray(physicsBodyData.collider)) {
        return physicsBodyData.collider.map((collider) => collider.handle);
      } else {
        return [physicsBodyData.collider.handle];
      }
    }
    return [];
  }

  getBounds(): THREE.Box3 {
    this.bounds.setFromObject(this.object3D);
    return this.bounds;
  }

  // Tag management

  addTag(tag: string): void {
    this.tags.add(tag);
  }

  removeTag(tag: string): void {
    this.tags.delete(tag);
  }

  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  addGameplayTag(tag: GameplayTag): void {
    this.gameplayTags.add(tag);
  }

  removeGameplayTag(tag: GameplayTag): void {
    this.gameplayTags.delete(tag);
  }

  hasGameplayTag(tag: GameplayTag): boolean {
    return this.gameplayTags.has(tag);
  }

  // Component management

  addComponent(component: EntityComponent): void {
    component.setEntity(this); // Link the component to this entity
    this.components.push(component);
  }

  removeComponent(componentName: string): void {
    const component = this.components.filter((comp) =>
      comp.isNameEqual(componentName),
    );
    if (component) {
      for (const comp of component) {
        comp.dispose(); // Clean up the component before removing it
        const idx = this.components.indexOf(comp);
        if (idx > -1) {
          this.components.splice(idx, 1); // Remove from the components array
        }
      }
    }
  }

  removeAllComponents(): void {
    for (const component of this.components) {
      component.dispose(); // Clean up each component before removing
    }
    this.components = [];
  }

  getComponent<T extends EntityComponent>(
    componentName: string,
  ): T | undefined {
    return this.components.find((comp) => comp.isNameEqual(componentName)) as
      | T
      | undefined;
  }

  hasComponent(componentName: string): boolean {
    return this.components.some((comp) => comp.isNameEqual(componentName));
  }

  // Attachment management

  onAttachObject3D?(object3D: THREE.Object3D): void {
    // Subclasses can implement this to react when an Object3D is attached
  }

  attachObject3D(object3D: THREE.Object3D): void {
    this.object3D.add(object3D);
    if (this.onAttachObject3D) {
      this.onAttachObject3D(object3D);
    }
  }

  onDetachObject3D?(object3D: THREE.Object3D): void {
    // Subclasses can implement this to react when an Object3D is detached
  }

  detachObject3D(object3D: THREE.Object3D): void {
    this.object3D.remove(object3D);
    if (this.onDetachObject3D) {
      this.onDetachObject3D(object3D);
    }
  }

  // Lifecycle methods

  abstract onCollide(otherEntity: Entity, started: boolean): void;

  collide(otherEntity: Entity, started: boolean): void {
    this.onCollide(otherEntity, started);
    for (const component of this.components) {
      if (component.collide) {
        component.collide(otherEntity, started);
      }
    }
  }

  damage(amount: number, sourceEntity?: Entity): void {
    for (const component of this.components) {
      if (component.damage) {
        component.damage(amount, sourceEntity);
      }
    }
  }

  /** onUpdate is overridden by subclasses to implement custom update logic */
  abstract onUpdate(args: UpdateArgs): void;

  update(args: UpdateArgs): void {
    if (!this.alive) return;
    this.onUpdate(args);
    this.components.forEach((component) => {
      component.update(args);
    });
  }

  /** Subclasses can implement this for custom cleanup logic when the entity is killed */
  abstract onDestroy(): void;

  kill(): void {
    if (!this.object3D) return; // Already killed or not properly initialized
    this.alive = false;
    this.onDestroy();
    this.getThreeScene()?.removeEntity(this, false);
    if (this.object3D.userData.entity) {
      delete this.object3D.userData.entity;
    }
    disposeObject3D(this.object3D);
    for (const component of this.components) {
      component.dispose();
    }
    const lists = [this.tags, this.gameplayTags];
    lists.forEach((list) => list.clear());
    for (const comp of this.components) {
      comp.dispose();
    }
    this.components = [];
    // Clear all references
    for (const key in this) {
      // @ts-ignore
      this[key] = null;
    }
  }

  // State management for saving/loading

  saveState(): EntityState {
    this.userData = {
      ...this.userData,
      transform: this.getTransform(),
      physics: undefined
    };
    return {
      name: this.object3D.name,
      entityType: this.entityType,
      tags: Array.from(this.tags),
      gameplayTags: Array.from(this.gameplayTags),
      userData: this.userData,
      components: Array.from(this.components.values()).map((component) =>
        component.saveState(),
      ),
    } as EntityState;
  }

  loadState(data: EntityState): void {
    // console.log("Loading entity state:", data);
    this.setName(data.name);
    this.setEntityType(data.entityType);
    this.setTransform(data.userData?.transform!);
    this.setTags(data.tags);
    this.setGameplayTags(data.gameplayTags);
    this.setUserData(data.userData);
    this.setComponents(data.components);
    this.setAlive(true);
  }
}
