import * as THREE from "three";
import { Entity, EntityComponentState, UpdateArgs } from "../../core";
import { EntityComponentBase } from "../../entitycompbase";
import { BodyTypes, CharacterController, RigidBody } from "../../physics";
import { RaycastSensor } from "../../raycastsensor";

/** A basic implementation of an AI controller component */
export class AiControllerComponent extends EntityComponentBase {
  private controller!: CharacterController; // Physics body controller

  private acceptanceRadius: number = 1.0; // How close the AI needs to get to the target position to consider it "reached"
  private targetPosition: THREE.Vector3 | null = null;
  private locationReachedCallback: ((entity: Entity) => void) | null = null;

  private velocity: THREE.Vector3 = new THREE.Vector3();
  private moveDirection: THREE.Vector3 = new THREE.Vector3();
  private moveSpeed: number = 8;

  private raycastSensor!: RaycastSensor;
  private raycastTimer: number = 0;
  private raycastInterval: number = 1.0; // seconds
  private raycastArcAngle: number = 90; // degrees

  private _tempVec3: THREE.Vector3 = new THREE.Vector3();

  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  setTargetEntity(targetEntity: Entity) {
    const targetPos = targetEntity.getObject3D().position;
    this.setTargetPosition(targetPos);
  }

  setTargetPosition(position: THREE.Vector3) {
    this.targetPosition = position;
  }

  setOnLocationReachedCallback(callback: (entity: Entity) => void) {
    this.locationReachedCallback = callback;
  }

  collide(otherEntity: Entity, started: boolean): void {
    // Default implementation does nothing, can be overridden by subclasses
  }
  
  onUpdate(args: UpdateArgs): void {
    const entity = this.getEntity();
    if (!this.targetPosition || !entity) {
      return;
    }
    const deltaTime = args.deltaTime;

    this.raycastTimer += deltaTime;
    if (this.raycastTimer >= this.raycastInterval) {
      this.raycastTimer = 0;
      // Perform raycasts to detect obstacles and adjust moveDirection accordingly
      const origin = entity.getObject3D().position;
      const directionToTarget = this.targetPosition.clone().sub(origin).normalize();
      const objects = entity.getThreeScene().children
      const hits = this.raycastSensor.castRays(origin, directionToTarget, this.raycastArcAngle, objects);
      if (hits.length > 0) {
        // If there are obstacles, find the best direction to move that avoids them
        this.moveDirection = this.raycastSensor.findBestDirection(origin, this.targetPosition, this.raycastArcAngle, objects);
      } else {
        // No obstacles, move directly towards target
        this.moveDirection.copy(directionToTarget);
      }
    } else {
      // Continue moving in the current moveDirection
      this.moveDirection.normalize();
    }

    // Add some gravity effect to keep the character grounded (optional, adjust as needed)
    this.velocity.y -= 9.81 * deltaTime;
    if (this.velocity.y < -20) {
      this.velocity.y = -20; // Terminal velocity
    }

    this.velocity.copy(this.moveDirection).multiplyScalar(this.moveSpeed * deltaTime);

    // Physics controller will handle collision and sliding along surfaces we just need a suggested transform based on our velocity and desired movement
    const controlledBodyData = entity.getPhysicsBodyData();
    this.controller.computeColliderMovement(
      controlledBodyData?.collider as any,
      this.velocity,
    );
    let computedMovement = this.controller.computedMovement();
    const body = controlledBodyData?.body as RigidBody;
    if (body.bodyType() !== BodyTypes.Kinematic) {
      body.setBodyType(BodyTypes.Kinematic, true);
    }
    body.setNextKinematicTranslation(
      this._tempVec3.addVectors(body.translation(), computedMovement)
    );

    // Check if we've reached the target position
    const distanceToTarget = entity.getObject3D().position.distanceTo(this.targetPosition);
    if (distanceToTarget <= this.acceptanceRadius) {
      // Target reached, you can trigger an event or set a new target here
      if (this.locationReachedCallback) {
        this.locationReachedCallback(entity);
      }
      this.targetPosition = null; // Clear target for now
    }
  }

  onDispose(): void { 
    if (!this.getEntity()) return;
    const scene = this.getThreeScene();
    scene.removeCharacterController(this.controller);
  }

  saveState(): EntityComponentState {
    return super.saveState();
  }

  loadState(state: EntityComponentState): void {
    const entity = this.getEntity();
    if (!entity) {
      throw new Error("AiControllerComponent: No entity attached to component.");
    }
    const scene = entity.getThreeScene();
    this.controller = scene.createCharacterController();
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.raycastSensor = new RaycastSensor(3, 5); // Example values, adjust as needed
  }
}