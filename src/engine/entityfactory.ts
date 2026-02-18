import { BASE_URL, EntityState } from "./types";
import { BasicEntity } from "./entities/basicentity";
import { BoxEntity } from "./entities/boxentity";
import { SphereEntity } from "./entities/sphereentity";
import { ThreeSceneBase } from "./threescenebase";
import { CapsuleEntity } from "./entities/capsuleentity";
import { RoundedBoxEntity } from "./entities/roundedboxentity";
import { CheckerBoxEntity } from "./entities/checkerboxentity";
import { ModelEntity } from "./entities/modelentity";
import { Entity } from "./entity";

/** EntityTypeMap defines a mapping from entity type strings to their corresponding entity classes */
interface EntityTypeMap {
  [key: string]: new (
    threeScene: ThreeSceneBase,
    config: EntityState,
  ) => Entity;
}

/** 
 * A mapping of entity types to their corresponding classes.
 * Add more as needed
 */
const entityTypeMap: EntityTypeMap = {
  Basic: BasicEntity,
  Box: BoxEntity,
  Sphere: SphereEntity,
  Capsule: CapsuleEntity,
  RoundedBox: RoundedBoxEntity,
  CheckerBox: CheckerBoxEntity,
  Model: ModelEntity,
};

export type EntityTypes = keyof typeof entityTypeMap;

export function createEntity<T extends Entity>(scene: ThreeSceneBase, config: EntityState): T {
  const EntityClass = entityTypeMap[config.entityType];
  if (!EntityClass) {
    throw new Error(`Entity type ${config.entityType} not found.`);
  }
  return new EntityClass(scene, config) as T;
}

export function createEntities(
  scene: ThreeSceneBase,
  configs: EntityState[],
): Entity[] {
  return configs.map((config) => createEntity(scene, config)).filter((entity): entity is Entity => entity !== undefined);
}

export function createAddEntities(
  scene: ThreeSceneBase,
  configs: EntityState[],
): void {
  const entities = createEntities(scene, configs);
  entities.forEach((entity) => scene.addEntity(entity, true));
}

export function saveEntityState(fileName: string, entity: Entity): any {
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

export function createEntityFromState(
  scene: ThreeSceneBase,
  state: EntityState,
): Entity {
  const entity = createEntity(scene, state);
  entity.loadState(state);
  return entity;
}

export async function loadEntityState(
  scene: ThreeSceneBase,
  fileName: string,
): Promise<Entity> {
  const response = await fetch(BASE_URL + fileName);
  const json = await response.json();
  const jsonObj = typeof json === "string" ? JSON.parse(json) : json;
  return createEntityFromState(scene, jsonObj);
}

export function duplicateEntity(scene: ThreeSceneBase, entity: Entity): Entity {
  const state = entity.saveState();
  return createEntityFromState(scene, state);
}

export function duplicateEntities(
  scene: ThreeSceneBase,
  entities: Entity[],
): Entity[] {
  return entities.map((entity) => duplicateEntity(scene, entity));
}

export function duplicateAddEntities(scene: ThreeSceneBase, entities: Entity[]): void {
  const duplicatedEntities = duplicateEntities(scene, entities);
  duplicatedEntities.forEach((entity) => scene.addEntity(entity, true));
}
