import { Octree } from "three/examples/jsm/Addons.js";
import { UpdateArgs, EntityComponentState, ColliderShape } from "./types";
import { Entity } from "./entity";

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
  collide?(otherEntity: Entity, started: boolean): void;
  damage?(amount: number, sourceEntity?: Entity): void;
  update(args: UpdateArgs): void;
  dispose(): void; // Cleans up resources but does not remove itself from the entity
  removeFromEntity(): void;

  // State management for saving/loading
  saveState(): EntityComponentState;
  // loadState(state: EntityComponentState): void;
}

/** Collider component interface */
export interface ColliderComponent extends EntityComponent {
  shape: ColliderShape;
  syncCollider(): void;
  resolveCollision(other: ColliderComponent): void;
  resolveOctreeCollision(octree: Octree): void;
}