import * as THREE from "three";
import {
  Entity,
  EntityComponentState,
  EntityState,
  GameplayTag,
  UpdateArgs,
  GameplayTags,
} from "../../core";
import { EntityComponentBase } from "../../entitycompbase";
import { EntityFactory, EntityTypes } from "../../entityfactory";
import { emissive } from "three/tsl";
import { RigidBody } from "../../physics";

/** A basic implementation of an entity component */
export class LauncherComponent extends EntityComponentBase {
  private launchForce: number = 10;
  private projectile: EntityTypes = "Box";
  private cooldown: number = 1000; // milliseconds
  private lastLaunchTime: number = 0;
  private canLaunch: boolean = true;
  private ownerTag: GameplayTag = GameplayTags.Player;
  private timeAlive: number = 1000; // milliseconds

  private cameraPos: THREE.Vector3 = new THREE.Vector3();
  private cameraDir: THREE.Vector3 = new THREE.Vector3();

  private arcVector: THREE.Vector3 = new THREE.Vector3(0, 0.015, 0); // Adjust this for more or less arc

  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  launch(head: THREE.Group, ownerTag: GameplayTag = this.ownerTag): Entity | undefined {
    if (!this.canLaunch) return undefined;
    const scene = this.getThreeScene();
    // scene.log(
    //   `Launching projectile with force ${this.launchForce} and cooldown ${this.cooldown}ms`,
    // );

    //Shoot from camera position in the direction it's facing
    const cameraPos = head.getWorldPosition(this.cameraPos);
    const cameraDir = head.getWorldDirection(this.cameraDir).multiplyScalar(-1); // Invert to get forward direction
    
    // add spread
    const spread = new THREE.Vector3(
      (Math.random() - 0.5) * 0.025,
      (Math.random() - 0.5) * 0.025,
      (Math.random() - 0.5) * 0.025
    );
    cameraDir.add(spread).normalize();

    cameraPos.add(cameraDir);

    const boxData: EntityState | any = {
      name: "projectile",
      entityType: this.projectile,
      gameplayTags: [GameplayTags.Projectile, ownerTag],
      userData: {
        radius: 0.3,
        segments: 16,
        material: {
          color: 0xffff00,
          metalness: 0.25,
          roughness: 0.5,
          emissive: 0xffaa88,
          emissiveIntensity: 8,
        },
        physicsData: {
          mass: 100,
          friction: 1,
          density: 1,
          restitution: 0.01,
        },
        transform: {
          position: cameraPos,
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
        },
      },
    };

    const spawnedProjectile = EntityFactory.createEntity(
      this.getThreeScene(),
      boxData,
    );
    scene.addEntity(spawnedProjectile, true);
    if (spawnedProjectile) {
      let dir = cameraDir.add(this.arcVector).normalize();
      scene.addImpulse(spawnedProjectile, dir, this.launchForce);

      const projectileBody = spawnedProjectile.getPhysicsBodyData().body as RigidBody;
      projectileBody.enableCcd(true);
    }

    this.canLaunch = false;
    this.lastLaunchTime = Date.now();

    setTimeout(() => {
      spawnedProjectile?.kill();
    }, this.timeAlive);

    return spawnedProjectile;
  }

  launchOnce(head: THREE.Group, ownerTag: GameplayTag = this.ownerTag): void {
    this.launch(head, ownerTag);
    this.removeFromEntity();
  }

  onUpdate(args: UpdateArgs): void {
    if (!this.canLaunch) {
      const currentTime = Date.now();
      if (currentTime - this.lastLaunchTime >= this.cooldown) {
        this.canLaunch = true;
        this.lastLaunchTime = currentTime;
      }
    }
  }

  onDispose(): void {}

  saveState(): EntityComponentState {
    const state = super.saveState();
    state.launchForce = this.launchForce;
    state.projectile = this.projectile;
    state.cooldown = this.cooldown;
    state.lastLaunchTime = this.lastLaunchTime;
    state.canLaunch = this.canLaunch;
    state.ownerTag = this.ownerTag;
    state.timeAlive = this.timeAlive;
    return state;
  }

  loadState(state: EntityComponentState): void {
    this.launchForce = state.launchForce ?? this.launchForce;
    this.projectile = state.projectile ?? this.projectile;
    this.cooldown = state.cooldown ?? this.cooldown;
    this.lastLaunchTime = state.lastLaunchTime ?? this.lastLaunchTime;
    this.canLaunch = state.canLaunch ?? this.canLaunch;
    this.ownerTag = state.ownerTag ?? this.ownerTag;
    this.timeAlive = state.timeAlive ?? this.timeAlive;
  }
}
