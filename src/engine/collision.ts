import * as THREE from "three";
import { Entity, ICollisionHandler, UpdateArgs } from "./core";

/** 
 * Collision manager to handle collision detection and response.
 * Uses simple AABB collision detection for rough collisions, and allows registering custom collision handlers for more specific collisions between entities.
 */
export class CollisionManager {
  private handlers = new Map<string, ICollisionHandler>();
  private static tmpBoxA = new THREE.Box3(); // Reusable boxes for collision checks to avoid allocations
  private static tmpBoxB = new THREE.Box3();
  constructor() {}

  /** Add a collider or an array of colliders */
  add(collider: ICollisionHandler | ICollisionHandler[]): void {
    if (Array.isArray(collider)) {
      collider.forEach((col) => this.handlers.set(col.name, col));
    } else {
      this.handlers.set(collider.name, collider);
    }
  }

  /** Remove a collider by name or an array of names */
  remove(collider: string | string[]): void {
    if (Array.isArray(collider)) {
      collider.forEach((col: string) => this.handlers.delete(col));
    } else {
      this.handlers.delete(collider);
    }
  }

  /** Get a collider by name */
  get(name: string): ICollisionHandler | undefined {
    return this.handlers.get(name);
  }

  /** Create and add a new collider */
  make(name: string, entitiesA: Set<Entity>, entitiesB: Set<Entity>, onCollision: (A: Entity, B: Entity) => void): ICollisionHandler {
    const collider: ICollisionHandler = {
      name,
      entitiesA,
      entitiesB,
      onCollision
    };
    this.handlers.set(name, collider);
    return collider;
  }

  /** Update collision detection and handling */
  update(args: UpdateArgs): void {
    this.handlers.forEach((handler) => {
      handler.entitiesA.forEach((entityA) => {
        handler.entitiesB.forEach((entityB) => {
          // check collision between entityA and entityB
          if (entityA !== entityB && entityA.getAlive() && entityB.getAlive()) {
            if (CollisionManager.checkCollision(entityA, entityB)) {
              handler.onCollision(entityA, entityB);
            }
          }
          // remove dead things from collider sets
          if (!entityA.getAlive()) handler.entitiesA.delete(entityA);
          if (!entityB.getAlive()) handler.entitiesB.delete(entityB);
        });
      });
    });
  }

  /** Dispose of all handlers */
  dispose(): void {
    this.handlers.clear();
  }

  /** Simple AABB collision detection */
  static checkCollision(A: Entity, B: Entity): boolean {
    const boxA = this.tmpBoxA.setFromObject(A.getObject3D());
    const boxB = this.tmpBoxB.setFromObject(B.getObject3D());
    return boxA.intersectsBox(boxB);
  }
}
