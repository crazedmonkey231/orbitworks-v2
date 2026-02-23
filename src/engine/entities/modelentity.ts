import { Object3D } from "three";
import { EntityState, UpdateArgs } from "../shared";
import { EntityBase } from "../entitybase";
import { ThreeSceneBase } from "../threescenebase";
import { getModel } from "../modelregistry";
import { Entity } from "../entity";


/** A basic model entity that uses a 3D model from the model registry */
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
    const model = getModel(entityState.userData.modelName);
    if (model) {
      return model;
    }
    return new Object3D();
  }
  
  onCollide(otherEntity: Entity, started: boolean): void { }
  onUpdate(args: UpdateArgs): void { }
  onDestroy(): void { }
}