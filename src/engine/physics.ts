import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";
// import { RapierPhysics, RapierPhysicsObject } from "three/addons/physics/RapierPhysics.js";
// import { RapierHelper } from "three/addons/helpers/RapierHelper.js";
import {
  Entity,
  PhysicsData,
  PhysicsState,
  Transform,
  UpdateArgs,
  XYZ,
} from "./core";
import { ThreeSceneBase } from "./threescenebase";

export interface PhysicsBodyData {
  body: RAPIER.RigidBody | RAPIER.RigidBody[];
  collider: RAPIER.Collider | RAPIER.Collider[];
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

/**
 * A wrapper class for the Rapier physics engine.
 * Physics may not be immediately available due to asynchronous loading, so objects will be queued until the engine is ready.
 * This class manages the physics world and provides methods to add/remove physics-enabled meshes.
 */
export class Physics {
  private threeScene: ThreeSceneBase;
  private world: RAPIER.World;
  private eventQueue: RAPIER.EventQueue;

  private _vector = new THREE.Vector3();
  private _quaternion = new THREE.Quaternion();
  private _matrix = new THREE.Matrix4();
  private _scale = new THREE.Vector3(1, 1, 1);

  private enabled: boolean = false;
  private gravity: XYZ = { x: 0, y: -9.81, z: 0 };

  constructor(threeScene: ThreeSceneBase, physicsState: PhysicsState) {
    this.enabled = physicsState.enabled;
    this.threeScene = threeScene;
    this.world = new RAPIER.World(this.gravity);
    this.eventQueue = new RAPIER.EventQueue(true);
    console.log("Physics system initialized:", this.enabled);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    for (const entity of this.threeScene.getEntities()) {
      this.removeEntity(entity);
    }
    if (enabled) {
      for (const entity of this.threeScene.getEntities()) {
        this.addEntity(entity);
      }
    }
    console.log(`Physics system ${enabled ? "enabled" : "disabled"}.`);
  }

  getEnabled() {
    return this.enabled;
  }

  toggleEnabled(override?: boolean) {
    this.setEnabled(override !== undefined ? override : !this.enabled);
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

  addEntity(entity: Entity) {
    const mesh = entity.getObject3D() as THREE.Mesh;
    if (mesh) {
      this.addMesh(mesh, entity.getPhysicsData());
    }
  }

  addMesh(mesh: THREE.Mesh, options?: PhysicsData) {
    const shape = getShape(mesh.geometry);
    if (!shape) {
      return;
    }
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
    const newBodyData = { body, collider } as PhysicsBodyData;

    if (!mesh.userData.physics) {
      mesh.userData.physics = {} as PhysicsBodyData;
    }

    mesh.userData.physics = newBodyData;
  }

  private removeBody(body: RAPIER.RigidBody | RAPIER.RigidBody[]) {
    if (Array.isArray(body)) {
      body.forEach((b) => this.world.removeRigidBody(b));
    } else {
      this.world.removeRigidBody(body);
    }
  }

  private removeCollider(collider: RAPIER.Collider | RAPIER.Collider[]) {
    const wakeUp = true;
    if (Array.isArray(collider)) {
      collider.forEach((c) => this.world.removeCollider(c, wakeUp));
    } else {
      this.world.removeCollider(collider, wakeUp);
    }
  }

  removeEntity(entity: Entity) {
    const mesh = entity.getObject3D() as THREE.Mesh;
    if (mesh) {
      this.removeMesh(mesh);
    }
  }

  removeMesh(mesh: THREE.Mesh) {
    const physicsData = mesh.userData.physics as PhysicsBodyData | undefined;
    if (physicsData) {
      if (physicsData.body) {
        this.removeBody(physicsData.body);
      }
      if (physicsData.collider) {
        this.removeCollider(physicsData.collider);
      }
      delete mesh.userData.physics;
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

  setEntityTransform(entity: Entity, transform: Transform) {
    const mesh = entity.getObject3D() as THREE.Mesh;
    this.setMeshTransform(mesh, transform);
  }

  setMeshTransform(mesh: THREE.Mesh, transform: Transform, index?: number) {
    const physicsData = mesh.userData.physics as PhysicsBodyData | undefined;
    if (physicsData?.body) {
      const position = transform.position || new THREE.Vector3();
      const rotation = transform.rotation || new THREE.Euler();
      const quaternion = new THREE.Quaternion().setFromEuler(rotation);
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

  setMeshVelocity(mesh: THREE.Mesh, velocity: THREE.Vector3, index?: number) {
    const physicsData = mesh.userData.physics as PhysicsBodyData | undefined;
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
    mesh: THREE.Mesh,
    impulse: THREE.Vector3,
    strength: number = 1,
    index?: number,
  ) {
    const physicsData = mesh.userData.physics as PhysicsBodyData | undefined;
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
    impulse: THREE.Vector3,
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
    mesh: THREE.Mesh,
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
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
      .setRotation(mesh.quaternion);
    const body = this.world.createRigidBody(bodyDesc);
    const collider = this.world.createCollider(colliderDesc, body);
    mesh.userData.physics = { body, collider } as PhysicsBodyData;
  }

  /** Update the physics helper */
  update(args: UpdateArgs) {
    if (!this.enabled) return;
    this.world.step(this.eventQueue);
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      // Handle collision events here if needed
    });
  }

  syncEntity(entity: any) {
    if (!this.enabled) return;
    const mesh = entity.getObject3D() as THREE.Mesh;
    this.syncMesh(mesh);
  }

  syncMesh(mesh: THREE.Mesh) {
    if (!this.enabled) return;
    const physicsBodyData = mesh.userData.physics as
      | PhysicsBodyData
      | undefined;
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
      }
    }
  }

  /** Dispose of physics resources */
  dispose() {
    this.enabled = false;
    this.world.free();
  }

  /** Save the state of the physics system */
  saveState(): PhysicsState {
    return {
      enabled: this.enabled,
      helper: false,
    };
  }

  loadState(state: PhysicsState) {
    this.setEnabled(state.enabled);
  }

  private debugSphere(
    size: number,
    position: THREE.Vector3,
    resolution: number = 64,
    color: number = 0xff0000,
    wireframe: boolean = true,
    duration: number = 500,
  ) {
    //   if (this.helper) {
    //     const sphere = new THREE.SphereGeometry(size, resolution, resolution);
    //     const mat = new THREE.MeshBasicMaterial({
    //       color: color,
    //       wireframe: wireframe,
    //       transparent: true,
    //       opacity: 0.5
    //     });
    //     const mesh = new THREE.Mesh(sphere, mat);
    //     mesh.position.copy(position);
    //     this.helper.add(mesh);
    //     setTimeout(() => {
    //       this.helper?.remove(mesh);
    //       disposeObject3D(mesh);
    //     }, duration);
    //   }
  }
}
