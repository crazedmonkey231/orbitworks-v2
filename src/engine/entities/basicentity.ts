import { Object3D } from "three";
import { EntityState, UpdateArgs } from "../shared";
import { EntityBase } from "../entitybase";
import { ThreeSceneBase } from "../threescenebase";
import { Entity } from "../entity";


/** A basic entity with no special behavior */
export class BasicEntity extends EntityBase {
  constructor(threeScene: ThreeSceneBase, state: EntityState) {
    super(threeScene, state);
    this.setName(state.name);
  }
  createObject3D(entityState: EntityState): Object3D {
    return new Object3D();
  }  
  onCollide(otherEntity: Entity, started: boolean): void { }
  onUpdate(args: UpdateArgs): void { }
  onDestroy(): void { }
}