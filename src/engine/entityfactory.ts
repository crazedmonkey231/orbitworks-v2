import { Entity, BASE_URL, EntityState } from "./core";
import { BasicEntity } from "./entities/basicentity";
import { BoxEntity } from "./entities/boxentity";
import { SphereEntity } from "./entities/sphereentity";
import { ThreeSceneBase } from "./threescenebase";
import { CapsuleEntity } from './entities/capsuleentity';
import { RoundedBoxEntity } from "./entities/roundedboxentity";

/** EntityTypeMap defines a mapping from entity type strings to their corresponding entity classes */
interface EntityTypeMap {
  [key: string]: new (threeScene: ThreeSceneBase, config: EntityState) => Entity;
}

/** A mapping of entity types to their corresponding classes, add more as needed */
const entityTypeMap: EntityTypeMap = {
  Basic: BasicEntity,
  Box: BoxEntity,
  Sphere: SphereEntity,
  Capsule: CapsuleEntity,
  RoundedBox: RoundedBoxEntity,
};

/**
 * EntityFactory is responsible for creating entities based on their type and configuration.
 * It provides methods to create single or multiple entities, add them to a scene, save and load their state, and duplicate them.
 * The factory uses a mapping of entity types to their corresponding classes to instantiate the correct entity based on the provided configuration.
 */
export class EntityFactory {
  static createEntity(threeScene: ThreeSceneBase, config: EntityState): Entity {
    const EntityClass = entityTypeMap[config.entityType];
    if (!EntityClass) {
      throw new Error(`Unknown entity type: ${config.entityType}`);
    }
    return new EntityClass(threeScene, config);
  }

  static createEntities(threeScene: ThreeSceneBase, configs: EntityState[]): Entity[] {
    return configs.map((config) => this.createEntity(threeScene, config));
  }

  static createAddEntities(scene: ThreeSceneBase, configs: EntityState[]): void {
    const entities = this.createEntities(scene, configs);
    entities.forEach((entity) => scene.addEntity(entity, true));
  }

  static saveEntityState(fileName: string, entity: Entity): any {
    const state = entity.saveState();
    const jsonString = JSON.stringify(state);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  static createEntityFromState(threeScene: ThreeSceneBase, state: EntityState): Entity {
    const entity = this.createEntity(threeScene, state);
    entity.loadState(state);
    return entity;
  }

  static async loadEntityState(threeScene: ThreeSceneBase, fileName: string): Promise<Entity> {
    const response = await fetch(BASE_URL + fileName);
    const json = await response.json();
    const jsonObj = typeof json === "string" ? JSON.parse(json) : json;
    return this.createEntityFromState(threeScene, jsonObj);
  }

  static duplicateEntity(threeScene: ThreeSceneBase, entity: Entity): Entity {
    const state = entity.saveState();
    return this.createEntityFromState(threeScene, state);
  }

  static duplicateEntities(threeScene: ThreeSceneBase, entities: Entity[]): Entity[] {
    return entities.map((entity) => this.duplicateEntity(threeScene, entity));
  }

  static duplicateAddEntities(scene: ThreeSceneBase, entities: Entity[]): void {
    const duplicatedEntities = this.duplicateEntities(scene, entities);
    duplicatedEntities.forEach((entity) => scene.addEntity(entity, true));
  }
}
