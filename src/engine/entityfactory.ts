import { BASE_URL, EntityState } from "./shared";
import { ThreeSceneBase } from "./threescenebase";
import { Entity } from "./entity";
import { EntityGame } from "./entitygame";


export function createEntity<T extends EntityGame>(
  scene: ThreeSceneBase,
  config: EntityState,
): T {
  return new EntityGame(scene, config) as T;
}

export function createEntities(
  scene: ThreeSceneBase,
  configs: EntityState[],
): EntityGame[] {
  return configs
    .map((config) => createEntity(scene, config))
    .filter((entity): entity is EntityGame => entity !== undefined);
}

export function createAddEntities(
  scene: ThreeSceneBase,
  configs: EntityState[],
): void {
  const entities = createEntities(scene, configs);
  entities.forEach((entity) => scene.addEntity(entity, entity.getUserData().isDynamic ?? true));
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

export function duplicateAddEntities(
  scene: ThreeSceneBase,
  entities: Entity[],
): void {
  const duplicatedEntities = duplicateEntities(scene, entities);
  duplicatedEntities.forEach((entity) => scene.addEntity(entity, entity.getUserData().isDynamic ?? true));
}
