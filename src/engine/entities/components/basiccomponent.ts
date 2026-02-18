import { Entity, EntityComponentState, UpdateArgs } from "../../core";
import { EntityComponentBase } from "../../entitycompbase";

/** A basic implementation of an entity component */
export class BasicEntityComponent extends EntityComponentBase {
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.loadState(state);
  }

  collide(otherEntity: Entity, started: boolean): void {
    // Default implementation does nothing, can be overridden by subclasses
  }
  
  onUpdate(args: UpdateArgs): void { }
  onDispose(): void { }

  saveState(): EntityComponentState {
    return super.saveState();
  }

  loadState(state: EntityComponentState): void {
    // No additional state to load for this basic component
  }
}