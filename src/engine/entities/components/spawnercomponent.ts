import { depth, texture, userData } from "three/tsl";
import {
  Entity,
  EntityComponentState,
  EntityState,
  GameplayTags,
  UpdateArgs,
} from "../../core";
import { EntityComponentBase } from "../../entitycompbase";
import { EntityFactory } from "../../entityfactory";
import { Vector3 } from "three";
import {
  Collider,
  COLLISION_GROUP,
  createCollisionGroups,
  setColliderGroups,
} from "../../physics";

/** A basic implementation of a spawner component */
export class SpawnerComponent extends EntityComponentBase {
  private spawnInterval: number = 5; // seconds
  private spawnTimer: number = 0;
  private enemyTextures: string[] = ["demon_dust", "demon_spoon", "demon_fork", "demon_cup"];
  private maxSpawnedEnemies: number = 10;

  private onSpawnCallback: ((spawnedEntity: Entity) => void) | null = null;

  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
    const collider = entity.getPhysicsBodyData().collider as Collider;
    if (collider) {
      const collisionGroups = createCollisionGroups(
        [COLLISION_GROUP.Spawner],
        [COLLISION_GROUP.World],
      );
      setColliderGroups(collider, collisionGroups);
    }
  }

  collide(otherEntity: Entity, started: boolean): void {
    // Default implementation does nothing, can be overridden by subclasses
  }

  setOnSpawnCallback(callback: (spawnedEntity: Entity) => void) {
    this.onSpawnCallback = callback;
  }

  setMaxSpawnedEnemies(max: number) {
    this.maxSpawnedEnemies = max;
  }

  setSpawnInterval(interval: number) {
    this.spawnInterval = interval;
  }

  onUpdate(args: UpdateArgs): void {
    if (
      this.getThreeScene().findEntitiesByGameplayTag(GameplayTags.Enemy)
        .length >= this.maxSpawnedEnemies
    ) {
      return; // Don't spawn if we've reached the max number of enemies
    }
    const entity = this.getEntity();
    if (!entity) {
      return;
    }
    const deltaTime = args.deltaTime;
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      // Spawn a new entity at the spawner's location
      const scene = entity.getThreeScene();
      const spawnPosition = entity.getObject3D().position.clone();
      const entityState: EntityState | any = {
        name: "SpawnedEntity",
        entityType: "Capsule",
        gameplayTags: [GameplayTags.Enemy],
        components: [
          {
            name: "Sprite",
            compType: "SpriteComp",
            textureName: this.enemyTextures[Math.floor(Math.random() * this.enemyTextures.length)],
          },
          {
            name: "Health",
            compType: "HealthComp",
            maxHealth: 100,
          },
          {
            name: "AiController",
            compType: "AiController",
          },
        ],
        userData: {
          radius: 0.5,
          height: 1,
          segments: 32,
          material: {
            color: 0xffffff,
            transparent:true,
            opacity: 0,
            depthWrite: false,
          },
          physicsData: {
            mass: 10,
            friction: 1,
            density: 1,
            restitution: 0.01,
          },
          transform: {
            position: spawnPosition,
            rotation: entity.getObject3D().rotation.clone(),
            scale: new Vector3(1, 1, 1),
          },
        },
      };
      const newEntity = EntityFactory.createEntity(scene, entityState);
      scene.addEntity(newEntity, true);
      const collider = newEntity.getPhysicsBodyData().collider as Collider;
      if (collider) {
        const collisionGroups = createCollisionGroups(
          [COLLISION_GROUP.Enemy],
          [COLLISION_GROUP.World, COLLISION_GROUP.Player, COLLISION_GROUP.Projectile],
        );
        setColliderGroups(collider, collisionGroups);
      }
      if (this.onSpawnCallback) {
        this.onSpawnCallback(newEntity);
      }
    }
  }

  onDispose(): void {}

  saveState(): EntityComponentState {
    const state = super.saveState();
    state.enemyTextures = this.enemyTextures;
    state.spawnInterval = this.spawnInterval;
    state.maxSpawnedEnemies = this.maxSpawnedEnemies;
    state.spawnTimer = this.spawnTimer;
    return state;
  }

  loadState(state: EntityComponentState): void {
    this.enemyTextures = state.enemyTextures || this.enemyTextures;
    this.spawnInterval = state.spawnInterval || this.spawnInterval;
    this.maxSpawnedEnemies = state.maxSpawnedEnemies || this.maxSpawnedEnemies;
    this.spawnTimer = state.spawnTimer || this.spawnTimer;
  }
}
