import { Entity, EntityComponentState, UpdateArgs } from "../../core";
import { EntityComponentBase } from "../../entitycompbase";

/** A basic implementation of an entity component */
export class BasicEntityComponent extends EntityComponentBase {
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
  }

  onUpdate(args: UpdateArgs): void { }
  onDispose(): void { }

  saveState(): EntityComponentState {
    return super.saveState();
  }

  loadState(state: EntityComponentState): void {
    super.loadState(state);
  }
}