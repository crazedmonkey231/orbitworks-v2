import * as THREE from "three";

import { EntityComponentBase } from "../../entitycompbase";
import { CharacterController, BodyTypes, RigidBody } from "../../physics";
import { DOWN_AXIS, EntityComponentState, UP_AXIS, UpdateArgs } from "../../shared";
import { Entity } from "../../entity";


// For Npcs we won't have actual keyboard input so we can use a dummy key inputs
interface DummyKey {
  isDown: boolean;
}

/** A basic implementation of an character controller component */
export class CharacterControllerComponent extends EntityComponentBase {
  private camera: THREE.PerspectiveCamera | undefined = undefined;
  private controller!: CharacterController; // Physics body controller
  private keyMap: { [key: string]: Phaser.Input.Keyboard.Key | DummyKey | undefined } = {
    W: undefined,
    A: undefined,
    S: undefined,
    D: undefined,
    E: undefined,
    Q: undefined,
    Up: undefined,
    Down: undefined,
    Left: undefined,
    Right: undefined,
    Space: undefined,
  };
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private moveSpeed = 12;
  private yaw: number = Math.PI;
  private pitch: number = 0;
  private readonly moveInput: THREE.Vector2 = new THREE.Vector2();
  private readonly moveDirection: THREE.Vector3 = new THREE.Vector3();
  private mouseSensitivity: number = 0.0025;

  private pitchLimitUpper: number = THREE.MathUtils.degToRad(85);
  private pitchLimitLower: number = THREE.MathUtils.degToRad(-85);

  private canMove: boolean = true;
  private onGround: boolean = false;
  private groundAcceleration: number = 3;
  private airAcceleration: number = 1;
  private groundDrag: number = 12;
  private airDrag: number = 5;
  private jumpVelocity: number = 0.75;

  private isNpc: boolean = false;
  private enableCameraMovement: boolean = true;

  private camPivotOffset: THREE.Vector3 = new THREE.Vector3(0, 0.5, 0);
  private camOffset: THREE.Vector3 = new THREE.Vector3(2.0, 0, 6);

  private camLagSpeed: number = 0.3;
  private readonly camOffsetCurrent: THREE.Vector3 = new THREE.Vector3();
  private readonly camOffsetTarget: THREE.Vector3 = new THREE.Vector3();
  private head: THREE.Group = new THREE.Group();

  private _tempVec3: THREE.Vector3 = new THREE.Vector3();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  private coyoteHandle: number | undefined = undefined;
  private groundMaxDistance: number = 2.5;

  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  setKeyDown(key: string, isDown: boolean): void {
    const keyObj = this.keyMap[key];
    if (keyObj) {
      if ('isDown' in keyObj) {
        keyObj.isDown = isDown;
      }
    }
  }

  lookAt(target: THREE.Vector3): void {
    const entity = this.getEntity();
    if (!entity) return;
    const lookOrigin = this.head.getWorldPosition(this._tempVec3);
    const dirToTarget = target.clone().sub(lookOrigin).normalize();
    this.yaw = Math.atan2(-dirToTarget.x, -dirToTarget.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(dirToTarget.y, -1, 1));
    this.applyLook();
  }

  setOnGround(onGround: boolean): void {
    this.onGround = onGround;
  }

  setCanMove(canMove: boolean): void {
    this.canMove = canMove;
  }

  setCameraMovementEnabled(enabled: boolean): void {
    this.enableCameraMovement = enabled;
  }

  getHead(): THREE.Group {
    return this.head;
  }

  getVelocity(): THREE.Vector3 {
    return this.velocity;
  }

  getIsNpc(): boolean {
    return this.isNpc;
  }

  getCamera(): THREE.PerspectiveCamera | undefined {
    return this.camera;
  }

  checkGround(): void {
    const origin = this._tempVec3.setFromMatrixPosition(this.head.matrixWorld);
    const direction = DOWN_AXIS;
    this.raycaster.set(origin, direction);
    const entity = this.getEntity()!;
    const eObject3D = entity.getObject3D();
    const intersects = this.raycaster.intersectObjects(
      entity.getThreeScene().children || [],
      false,
    );
    const filteredIntersects = intersects.filter(
      (intersect) =>
        intersect.distance > 0 &&
        intersect.object !== this.head &&
        intersect.object.parent !== eObject3D &&
        intersect.object !== eObject3D,
    );
    if (
      filteredIntersects.length > 0 &&
      filteredIntersects[0].distance <= this.groundMaxDistance
    ) {
      this.setOnGround(true);
      if (this.coyoteHandle) {
        clearTimeout(this.coyoteHandle);
        this.coyoteHandle = undefined;
      }
    } else {
      if (this.onGround && !this.coyoteHandle) {
        this.coyoteHandle = setTimeout(() => {
          this.setOnGround(false);
          this.coyoteHandle = undefined;
        }, 200);
      }
    }
  }

  private onMouseMove(event: any): void {
    if (!this.enableCameraMovement) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    this.yaw -= movementX * this.mouseSensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - movementY * this.mouseSensitivity,
      this.pitchLimitLower,
      this.pitchLimitUpper,
    );
    this.applyLook();
  }

  private onMouseClick(e: any): void {
    const phaserScene = this.getEntity()?.getThreeScene()?.getPhaserScene();
    if (phaserScene && !phaserScene.input.mouse?.locked) {
      phaserScene.input.mouse?.requestPointerLock();
    }
  }

  private applyLook(): void {
    const entity = this.getEntity()!;
    entity.setRotation(0, this.yaw, 0);
    this.head.position.copy(this.camPivotOffset);
    this.head.rotation.set(this.pitch, 0, 0);
    this.head.updateMatrixWorld();
  }

  private updateCameraOffset(deltaTime: number): void {
    if (!this.enableCameraMovement || !this.camera) return;
    const horizontalSpeed = Math.sqrt(
      this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z,
    );
    const speedFactor = THREE.MathUtils.clamp(
      horizontalSpeed / this.moveSpeed,
      0,
      1,
    );

    this.camOffsetTarget.set(
      this.camOffset.x,
      this.camOffset.y + speedFactor * 0.08,
      this.camOffset.z + speedFactor * 0.4,
    );

    const t = 1 - Math.exp(-this.camLagSpeed * deltaTime);
    this.camOffsetCurrent.lerp(this.camOffsetTarget, t);
    if (this.camera) {
      this.camera.position.copy(this.camOffsetCurrent);
    }
  }

  onUpdate(args: UpdateArgs): void {
    const controlledBodyData = this.getEntity()?.getPhysicsBodyData();
    if (!controlledBodyData) {
      return;
    }
    const deltaTime = args.deltaTime;

    if (this.canMove) {
      this.checkGround();
      const keyMap = this.keyMap;
      const forward =
        (keyMap.W?.isDown || keyMap.Up?.isDown ? 1 : 0) -
        (keyMap.S?.isDown || keyMap.Down?.isDown ? 1 : 0);
      const strafe =
        (keyMap.D?.isDown || keyMap.Right?.isDown ? 1 : 0) -
        (keyMap.A?.isDown || keyMap.Left?.isDown ? 1 : 0);
      this.moveInput.set(strafe, forward);

      const hasMoveInput = this.moveInput.lengthSq() > 0;
      if (hasMoveInput && this.moveInput.lengthSq() > 1) {
        this.moveInput.normalize();
      }

      if (hasMoveInput) {
        this.moveDirection
          .set(this.moveInput.x, 0, -this.moveInput.y)
          .normalize();
        this.moveDirection.applyAxisAngle(UP_AXIS, this.yaw);
        const acceleration = this.onGround
          ? this.groundAcceleration
          : this.airAcceleration;
        this.velocity.addScaledVector(
          this.moveDirection,
          acceleration * deltaTime,
        );
      }

      const damping = this.onGround ? this.groundDrag : this.airDrag;
      this.velocity.x -= this.velocity.x * damping * deltaTime;
      this.velocity.z -= this.velocity.z * damping * deltaTime;

      const maxHorizontalSpeed = this.moveSpeed;
      const horizontalSpeedSq =
        this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;
      if (horizontalSpeedSq > maxHorizontalSpeed * maxHorizontalSpeed) {
        const scale = maxHorizontalSpeed / Math.sqrt(horizontalSpeedSq);
        this.velocity.x *= scale;
        this.velocity.z *= scale;
      }

      if (keyMap.Space?.isDown && this.onGround) {
        this.velocity.y = this.jumpVelocity;
        this.onGround = false;
      }

      if (!this.onGround) {
        this.velocity.y -= 1.5 * deltaTime;
        if (this.velocity.y < -10) {
          this.velocity.y = -10;
        }
      } else if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }

      // Physics controller will handle collision and sliding along surfaces we just need a suggested transform based on our velocity and desired movement
      this.controller.computeColliderMovement(
        controlledBodyData?.collider as any,
        this.velocity,
      );
      let computedMovement = this.controller.computedMovement();
      const body = controlledBodyData?.body as RigidBody;
      body.setNextKinematicTranslation(
        this._tempVec3.addVectors(body.translation(), computedMovement),
      );
    }

    this.applyLook();
    this.updateCameraOffset(deltaTime);
  }

  onDispose(): void {
    if (!this.getEntity()) return;
    const scene = this.getThreeScene();
    const phaserScene = scene?.getPhaserScene();
    if (phaserScene) {
      phaserScene.input.off("pointermove", this.onMouseMove, this);
      phaserScene.input.off("pointerdown", this.onMouseClick, this);
    }
    scene.removeCharacterController(this.controller);
  }

  saveState(): EntityComponentState {
    return super.saveState();
  }

  loadState(state: EntityComponentState): void {
    const entity = this.getEntity();
    if (!entity) {
      throw new Error(
        "CharacterControllerComponent: No entity attached to component.",
      );
    }

    const scene = entity.getThreeScene();
    this.controller = scene.createCharacterController();
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.controller.setSlideEnabled(true);

    const controlledBodyData = entity.getPhysicsBodyData();
    const body = controlledBodyData?.body as RigidBody;
    if (body.bodyType() !== BodyTypes.Kinematic) {
      body.setBodyType(BodyTypes.Kinematic, true);
    }

    this.isNpc = state.isNpc ?? this.isNpc;
    console.log("CharacterController isNpc:", this.isNpc);
    let camera = undefined;
    if (this.isNpc) {
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      for (const key in this.keyMap) {
        this.keyMap[key] = { isDown: false };
      }
    } else {
      camera = scene.getCamera();
      for (const key in this.keyMap) {
        this.keyMap[key] = scene.addKey(key);
      }
    }
    camera.rotation.set(0, 0, 0);
    camera.rotation.order = "YXZ";

    this.camOffset.copy(state.camOffset ?? this.camOffset);
    this.camLagSpeed = state.camLagSpeed ?? this.camLagSpeed;
    this.camPivotOffset.copy(state.camPivotOffset ?? this.camPivotOffset);
    this.moveSpeed = state.moveSpeed ?? this.moveSpeed;
    this.canMove = state.canMove ?? this.canMove;

    this.head.name = "CharacterControllerHead";
    this.head.rotation.order = "YXZ";
    this.head.position.copy(this.camPivotOffset);
    this.camOffsetCurrent.copy(this.camOffset);
    camera.position.copy(this.camOffsetCurrent);
    this.head.add(camera);

    this.camera = camera;

    entity.attachObject3D(this.head);
    this.applyLook();

    const phaserScene = entity.getThreeScene().getPhaserScene();
    if (phaserScene && !this.isNpc) {
      phaserScene.input.on("pointermove", this.onMouseMove, this);
      phaserScene.input.on("pointerdown", this.onMouseClick, this);
    }
  }
}
