import { EntityComponentState, UpdateArgs } from "../../shared";
import { EntityComponentBase } from "../../entitycompbase";
import { Entity } from "../../entity";
import { Collider } from "../../physics";

/** A basic implementation of an entity component */
export class SensorComponent extends EntityComponentBase {
  onSensor: ((entityA: Entity, entityB: Entity) => void | undefined) | undefined;
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  setOnSensor(callback: (entityA: Entity, entityB: Entity) => void): void {
    this.onSensor = callback;
  }

  onUpdate(args: UpdateArgs): void { 
    if (!this.onSensor) return; // No need to test if no callback is set
    const entity = this.getEntity();
    if (!entity) return;
    const scene = this.getThreeScene();
    const bodyData = entity.getPhysicsBodyData();
    scene.sensorTest(bodyData.collider as Collider, (entityA: Entity, entityB: Entity) => {
      this.onSensor?.(entityA, entityB);
    });
  }

  onDispose(): void { }

  saveState(): EntityComponentState {
    return super.saveState();
  }

  loadState(state: EntityComponentState): void {
    if (state.onSensor) {
      this.setOnSensor(state.onSensor);
    }
  }
}