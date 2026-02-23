import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";
import { RapierHelper } from "three/addons/helpers/RapierHelper.js";
import { PhysicsState, Transform, UpdateArgs, XYZ } from "./shared";
import { ThreeSceneBase } from "./threescenebase";
import { Entity } from "./entity";

// Re-export RAPIER types for convenience and variables for the physics system

export type RigidBody = RAPIER.RigidBody;
export type Collider = RAPIER.Collider;

export interface PhysicsBodyData {
  body: RigidBody | RigidBody[] | undefined;
  collider: Collider | Collider[] | undefined;
}

export type CharacterController = RAPIER.KinematicCharacterController;

export const BodyTypes = {
  Static: RAPIER.RigidBodyType.Fixed,
  Dynamic: RAPIER.RigidBodyType.Dynamic,
  Kinematic: RAPIER.RigidBodyType.KinematicPositionBased,
};

export type BodyType = (typeof BodyTypes)[keyof typeof BodyTypes];

export const ActiveCollisionTypes = RAPIER.ActiveCollisionTypes;
export const ActiveEvents = RAPIER.ActiveEvents;

export const COLLISION_GROUP = {
  World: 0,
  Player: 1,
  Projectile: 2,
  Enemy: 3,
  Spawner: 4,
  Sensor: 5,
} as const;

const RAPIER_MAX_COLLISION_GROUP = 15;

export interface PhysicsCollisionData {
  memberships: number[];
  filters: number[];
  activeCollisionTypes?: RAPIER.ActiveCollisionTypes;
  activeEvents?: RAPIER.ActiveEvents;
}

// Utility functions

export function setColliderGroups(
  colliderData: Collider | Collider[] | null | undefined,
  groups: number,
): void {
  if (!colliderData) return;
  if (Array.isArray(colliderData)) {
    colliderData.forEach((collider) => collider.setCollisionGroups(groups));
    return;
  }
  colliderData.setCollisionGroups(groups);
}

/** Packs Rapier collision groups into `0xMMMMFFFF` (membership/filter). */
export function createCollisionGroups(
  memberships: number[],
  filters: number[],
): number {
  const membershipMask = groupsToMask(memberships);
  const filterMask = groupsToMask(filters);
  return ((membershipMask & 0xffff) << 16) | (filterMask & 0xffff);
}

/** Converts group indices (0-15) into a 16-bit mask. */
export function groupsToMask(groups: number[]): number {
  if (!groups.length) return 0;
  let mask = 0;
  for (const group of groups) {
    if (
      !Number.isInteger(group) ||
      group < 0 ||
      group > RAPIER_MAX_COLLISION_GROUP
    ) {
      throw new Error(
        `Invalid collision group "${group}". Expected an integer in [0, ${RAPIER_MAX_COLLISION_GROUP}].`,
      );
    }
    mask |= 1 << group;
  }
  return mask & 0xffff;
}

function getShape(geometry: THREE.BufferGeometry): RAPIER.ColliderDesc | null {
  const parameters = (geometry as any).parameters;
  if (geometry.type === "RoundedBoxGeometry") {
    const sx = parameters.width !== undefined ? parameters.width / 2 : 0.5;
    const sy = parameters.height !== undefined ? parameters.height / 2 : 0.5;
    const sz = parameters.depth !== undefined ? parameters.depth / 2 : 0.5;
    const radius = parameters.radius !== undefined ? parameters.radius : 0.1;
    return RAPIER.ColliderDesc.roundCuboid(
      sx - radius,
      sy - radius,
      sz - radius,
      radius,
    );
  } else if (geometry.type === "BoxGeometry") {
    const sx = parameters.width !== undefined ? parameters.width / 2 : 0.5;
    const sy = parameters.height !== undefined ? parameters.height / 2 : 0.5;
    const sz = parameters.depth !== undefined ? parameters.depth / 2 : 0.5;
    return RAPIER.ColliderDesc.cuboid(sx, sy, sz);
  } else if (
    geometry.type === "SphereGeometry" ||
    geometry.type === "IcosahedronGeometry"
  ) {
    const radius = parameters.radius !== undefined ? parameters.radius : 1;
    return RAPIER.ColliderDesc.ball(radius);
  } else if (geometry.type === "CylinderGeometry") {
    const radius =
      parameters.radiusBottom !== undefined ? parameters.radiusBottom : 0.5;
    const length = parameters.height !== undefined ? parameters.height : 0.5;
    return RAPIER.ColliderDesc.cylinder(length / 2, radius);
  } else if (geometry.type === "CapsuleGeometry") {
    const radius = parameters.radius !== undefined ? parameters.radius : 0.5;
    const length = parameters.height !== undefined ? parameters.height : 0.5;
    return RAPIER.ColliderDesc.capsule(length / 2, radius);
  } else if (geometry.type === "BufferGeometry") {
    const vertices = [];
    const vertex = new THREE.Vector3();
    const position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      vertices.push(vertex.x, vertex.y, vertex.z);
    }
    // if the buffer is non-indexed, generate an index buffer
    const indices =
      (geometry.getIndex()?.array as Uint32Array) ||
      Uint32Array.from(Array(parseInt(`${vertices.length / 3}`)).keys());
    return RAPIER.ColliderDesc.trimesh(new Float32Array(vertices), indices);
  }
  console.error("RapierPhysics: Unsupported geometry type:", geometry.type);
  return null;
}

// The main Physics class that wraps the Rapier physics engine.

/**
 * A wrapper class for the Rapier physics engine.
 * This class manages the physics world and provides methods to add/remove physics-enabled entities.
 */
export class Physics {
  private threeScene: ThreeSceneBase;
  private world: RAPIER.World;
  private eventQueue: RAPIER.EventQueue;
  private helper: RapierHelper | null = null;

  private _vector = new THREE.Vector3();
  private _quaternion = new THREE.Quaternion();
  private _matrix = new THREE.Matrix4();
  private _scale = new THREE.Vector3(1, 1, 1);

  private physicsState: PhysicsState;
  private entityBodyHandles = new Map<Entity, number[]>();
  private defaultGravity = { x: 0, y: -9.81, z: 0 };

  constructor(threeScene: ThreeSceneBase, physicsState: PhysicsState) {
    this.physicsState = physicsState;
    this.threeScene = threeScene;
    this.world = new RAPIER.World(
      physicsState.gravity || this.defaultGravity,
    );
    this.eventQueue = new RAPIER.EventQueue(true);
    this.createHelper(this.physicsState);
    console.log("Physics system initialized:", this.physicsState.enabled);
  }

  setGravity(gravity: XYZ) {
    this.physicsState.gravity = gravity;
    this.world.gravity = gravity;
  }

  getGravity(): XYZ {
    return this.physicsState.gravity || this.defaultGravity;
  }

  createHelper(physicsState: PhysicsState) {
    if (physicsState.helper) {
      if (this.helper) {
        return;
      }
      this.helper = new RapierHelper(this.world as any);
      if (physicsState.helper) {
        this.threeScene.add(this.helper);
      }
    } else {
      if (this.helper) {
        this.threeScene.remove(this.helper);
        this.helper = null;
      }
    }
  }

  setEnabled(enabled: boolean, helperEnabled?: boolean) {
    this.physicsState.enabled = enabled;
    for (const entity of this.threeScene.getEntities()) {
      this.removeEntity(entity);
    }
    for (const body of this.world.bodies.getAll()) {
      this.world.removeRigidBody(body);
    }
    if (enabled) {
      for (const entity of this.threeScene.getEntities()) {
        this.addEntity(entity);
      }
    }
    if (helperEnabled !== undefined) {
      this.physicsState.helper = helperEnabled;
    } else {
      this.physicsState.helper = enabled;
    }
    this.createHelper(this.physicsState);
  }

  getEnabled() {
    return this.physicsState.enabled;
  }

  toggleEnabled(override?: boolean) {
    this.setEnabled(
      override !== undefined ? override : !this.physicsState.enabled,
    );
  }

  getEntityByHandle(handle: number): Entity | undefined {
    for (const [entity, handles] of this.entityBodyHandles.entries()) {
      if (handles.includes(handle)) {
        return entity;
      }
    }
    return undefined;
  }

  setBodyCollisionData(entity: Entity, data: PhysicsCollisionData): void {
    const physicsData = entity.getPhysicsBodyData();
    const collider = physicsData?.collider;
    const collisionGroups = createCollisionGroups(data.memberships, data.filters);
    setColliderGroups(collider, collisionGroups);
    if (data.activeCollisionTypes) {
      if (Array.isArray(collider)) {
        collider.forEach((c) => c.setActiveCollisionTypes(data.activeCollisionTypes!));
      } else if (collider) {
        collider.setActiveCollisionTypes(data.activeCollisionTypes);
      }
    }
    if (data.activeEvents) {
      if (Array.isArray(collider)) {
        collider.forEach((c) => c.setActiveEvents(data.activeEvents!));
      } else if (collider) {
        collider.setActiveEvents(data.activeEvents);
      }
    }
  }

  private createBody(
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    mass: number,
    shape: RAPIER.ColliderDesc,
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setRotation(quaternion);
    const body = this.world.createRigidBody(bodyDesc);

    // Set body type based on mass, default is dynamic, 0=fixed, <0=kinematic
    let bodyType = RAPIER.RigidBodyType.Dynamic;
    if (mass === 0) {
      bodyType = RAPIER.RigidBodyType.Fixed;
    } else if (mass < 0) {
      bodyType = RAPIER.RigidBodyType.KinematicPositionBased;
    }
    body.setBodyType(bodyType, true);

    const colliderDesc = shape.setDensity(mass);
    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  private createInstancedBody(
    mesh: THREE.InstancedMesh,
    mass: number,
    shape: RAPIER.ColliderDesc,
  ) {
    const array = mesh.instanceMatrix.array;
    const bodies = [];
    const colliders = [];
    for (let i = 0; i < mesh.count; i++) {
      const position = this._vector.fromArray(array, i * 16 + 12);
      const { body, collider } = this.createBody(
        position,
        new THREE.Quaternion(),
        mass,
        shape,
      );
      bodies.push(body);
      colliders.push(collider);
    }
    return { body: bodies, collider: colliders };
  }

  createController(gap: number = 0.01): CharacterController {
    return this.world.createCharacterController(gap);
  }

  removeController(controller: CharacterController) {
    this.world.removeCharacterController(controller);
  }

  addEntity(entity: Entity) {
    const mesh = entity.getAsMesh();
    if (!mesh) {
      return;
    }
    const shape = getShape(mesh.geometry);
    if (!shape) {
      return;
    }

    const options = entity.getPhysicsData();
    const mass = options?.mass ?? 1;
    const friction = options?.friction ?? 0.5;
    const density = options?.density ?? 1;
    const restitution = options?.restitution ?? 0.5;

    shape.setMass(mass);
    shape.setFriction(friction);
    shape.setDensity(density);
    shape.setRestitution(restitution);

    let body: RAPIER.RigidBody | RAPIER.RigidBody[] | null = null;
    let collider: RAPIER.Collider | RAPIER.Collider[] | null = null;

    if (mesh instanceof THREE.InstancedMesh) {
      ({ body, collider } = this.createInstancedBody(mesh, mass, shape));
    } else {
      ({ body, collider } = this.createBody(
        mesh.position,
        mesh.quaternion,
        mass,
        shape,
      ));
    }
    entity.setPhysicsBodyData({ body, collider } as PhysicsBodyData);
    this.entityBodyHandles.set(
      entity,
      Array.isArray(body) ? body.map((b) => b.handle) : [body.handle],
    );
  }

  private removeBody(body: RAPIER.RigidBody | RAPIER.RigidBody[]) {
    if (!body) return;
    if (Array.isArray(body)) {
      body.forEach((b) => this.world.removeRigidBody(b));
    } else {
      this.world.removeRigidBody(body);
    }
  }

  private removeCollider(collider: RAPIER.Collider | RAPIER.Collider[]) {
    if (!collider) return;
    const wakeUp = true;
    if (Array.isArray(collider)) {
      collider.forEach((c) => this.world.removeCollider(c, wakeUp));
    } else {
      this.world.removeCollider(collider, wakeUp);
    }
  }

  removeEntity(entity: Entity) {
    const physics = entity.getPhysicsBodyData();
    if (physics) {
      if (physics.body) {
        this.removeBody(physics.body);
      }
      if (physics.collider) {
        this.removeCollider(physics.collider);
      }
      entity.setPhysicsBodyData(undefined);
      this.entityBodyHandles.delete(entity);
    }
  }

  private setTranslation(
    body: RAPIER.RigidBody | RAPIER.RigidBody[],
    position: THREE.Vector3,
  ) {
    if (Array.isArray(body)) {
      body.forEach((b) => {
        b.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
        b.setAngvel({ x: 0, y: 0, z: 0 }, true);
        b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      });
    } else {
      body.setTranslation(
        { x: position.x, y: position.y, z: position.z },
        true,
      );
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }

  setEntityTransform(entity: Entity, transform: Transform, index?: number) {
    const physicsData = entity.getPhysicsBodyData();
    if (physicsData?.body) {
      const position = transform.position || new THREE.Vector3();
      const quaternion = transform.quaternion || new THREE.Quaternion();
      if (Array.isArray(physicsData.body)) {
        if (index !== undefined && physicsData.body[index]) {
          this.setTranslation(physicsData.body[index], position);
          physicsData.body[index].setRotation(quaternion, true);
        }
      } else {
        this.setTranslation(physicsData.body, position);
        physicsData.body.setRotation(quaternion, true);
      }
    }
  }

  setEntityVelocity(entity: Entity, velocity: THREE.Vector3, index?: number) {
    const physicsData = entity.getPhysicsBodyData();
    if (physicsData?.body) {
      if (Array.isArray(physicsData.body)) {
        if (index !== undefined && physicsData.body[index]) {
          physicsData.body[index].setLinvel(
            { x: velocity.x, y: velocity.y, z: velocity.z },
            true,
          );
        }
      } else {
        physicsData.body.setLinvel(
          { x: velocity.x, y: velocity.y, z: velocity.z },
          true,
        );
      }
    }
  }

  addImpulse(
    entity: Entity,
    impulse: THREE.Vector3,
    strength: number = 1,
    index?: number,
  ) {
    const physicsData = entity.getPhysicsBodyData();
    if (physicsData?.body) {
      if (Array.isArray(physicsData.body)) {
        if (index !== undefined && physicsData.body[index]) {
          physicsData.body[index].applyImpulse(
            {
              x: impulse.x * strength,
              y: impulse.y * strength,
              z: impulse.z * strength,
            },
            true,
          );
        }
      } else {
        physicsData.body.applyImpulse(
          {
            x: impulse.x * strength,
            y: impulse.y * strength,
            z: impulse.z * strength,
          },
          true,
        );
      }
    }
  }

  addImpulseAtPoint(
    point: THREE.Vector3,
    strength: number = 1,
    range: number = 5,
  ) {
    this.world.forEachRigidBody((body) => {
      const bodyPos = body.translation();
      const distance = Math.sqrt(
        (bodyPos.x - point.x) ** 2 +
          (bodyPos.y - point.y) ** 2 +
          (bodyPos.z - point.z) ** 2,
      );
      if (distance < range) {
        const direction = new THREE.Vector3(
          bodyPos.x - point.x,
          bodyPos.y - point.y,
          bodyPos.z - point.z,
        ).normalize();
        const impulseVec = direction.multiplyScalar(
          strength * (1 - distance / range),
        );
        body.applyImpulse(
          { x: impulseVec.x, y: impulseVec.y, z: impulseVec.z },
          true,
        );
      }
    });
  }

  addHeightfield(
    entity: Entity,
    width: number,
    depth: number,
    heights: Float32Array,
    scale: THREE.Vector3,
  ) {
    const colliderDesc = RAPIER.ColliderDesc.heightfield(
      width,
      depth,
      heights,
      scale,
    );
    const mesh = entity.getAsMesh();
    if (!mesh) {
      console.error("Physics.addHeightfield: Entity does not have a mesh.");
      return;
    }
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
      .setRotation(mesh.quaternion);
    const body = this.world.createRigidBody(bodyDesc);
    const collider = this.world.createCollider(colliderDesc, body);
    entity.setPhysicsBodyData({ body, collider } as PhysicsBodyData);
  }

  /** Update the physics helper */
  update(args: UpdateArgs) {
    if (!this.physicsState.enabled) return;
    if (this.helper) {
      this.helper.update();
    }
    const dt = args.deltaTime;
    const steps = Math.ceil(dt / (1 / 120));
    const stepTime = dt / steps;
    this.world.timestep = stepTime;
    for (let i = 0; i < steps; i++) {
      this.world.step(this.eventQueue);
    }
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const entity1 = this.getEntityByHandle(handle1);
      const entity2 = this.getEntityByHandle(handle2);
      if (entity1 && entity2) {
        this.threeScene.entityCollision(entity1, entity2, started);
      }
    });
  }

  syncEntity(entity: Entity) {
    if (!this.physicsState.enabled) return;
    const mesh = entity.getAsMesh();
    if (!mesh) return;
    const physicsBodyData = entity.getPhysicsBodyData();
    if (physicsBodyData?.body) {
      if (Array.isArray(physicsBodyData.body)) {
        if (mesh instanceof THREE.InstancedMesh) {
          const array = mesh.instanceMatrix.array;
          if (!physicsBodyData || !Array.isArray(physicsBodyData.body)) return;
          const bodies = physicsBodyData.body;
          const count = Math.min(mesh.count, bodies.length);
          for (let j = 0; j < count; j++) {
            const body = bodies[j];
            const translation = body.translation();
            const position = this._vector.set(
              translation.x,
              translation.y,
              translation.z,
            );
            this._quaternion.copy(body.rotation());
            this._matrix
              .compose(position, this._quaternion, this._scale)
              .toArray(array, j * 16);
          }
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
        }
      } else {
        const position = physicsBodyData.body.translation();
        const rotation = physicsBodyData.body.rotation();
        mesh.position.set(position.x, position.y, position.z);
        mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        mesh.updateMatrixWorld();
      }
    }
  }

  /** Dispose of physics resources */
  dispose() {
    this.physicsState.enabled = false;
    this.world.free();
  }

  /** Save the state of the physics system */
  saveState(): PhysicsState {
    return {
      enabled: this.physicsState.enabled,
      helper: this.physicsState.helper,
      gravity: this.physicsState.gravity,
    };
  }

  loadState(state: PhysicsState) {
    this.setEnabled(state.enabled, state.helper);
    this.setGravity(state.gravity || this.defaultGravity);
    this.physicsState = state;
  }
}
