import { Object3D } from "three";
import { EntityState, UpdateArgs } from "../core";
import { EntityBase } from "../entitybase";
import { ThreeSceneBase } from "../threescenebase";


/** A basic entity with no special behavior */
export class BasicEntity extends EntityBase {
  constructor(threeScene: ThreeSceneBase, state: EntityState) {
    super(threeScene, state);
    this.setName(state.name);
  }
  createObject3D(entityState: EntityState): Object3D {
    return new Object3D();
  }
  onUpdate(args: UpdateArgs): void { }
  onDestroy(): void { }
}