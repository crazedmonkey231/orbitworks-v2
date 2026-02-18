import { Object3D } from "three";
import { EntityState, UpdateArgs } from "../types";
import { EntityBase } from "../entitybase";
import { ThreeSceneBase } from "../threescenebase";
import { ModelRegistry } from "../modelregistry";
import { Entity } from "../entity";


/** A basic entity with no special behavior */
export class ModelEntity extends EntityBase {
  constructor(threeScene: ThreeSceneBase, state: EntityState) {
    super(threeScene, state);
    this.setName(state.name);
  }
  createObject3D(entityState: EntityState): Object3D {
    if (!entityState.userData.modelName) {
      console.warn(`ModelEntity ${entityState.name} is missing modelName in state. Using empty Object3D.`);
      return new Object3D();
    }
    const model = ModelRegistry.getModel(entityState.userData.modelName);
    if (model) {
      return model;
    }
    return new Object3D();
  }
  
  onCollide(otherEntity: Entity, started: boolean): void { }
  onUpdate(args: UpdateArgs): void { }
  onDestroy(): void { }
}