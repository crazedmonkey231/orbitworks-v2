import { EntityComponentState, UpdateArgs } from "../../types";
import { EntityComponentBase } from "../../entitycompbase";
import { Entity } from "../../entity";

/** 
 * A basic implementation of a collision component used for registering collision callbacks on physics based entities. 
 * Must have ColllisionTypes and ActiveEvents registered. 
 */
export class CollisionComponent extends EntityComponentBase {
  private onCollisionCallback: (otherEntity: Entity, started: boolean) => void;
  constructor(entity: Entity, state: EntityComponentState) {
    super(entity, state);
    this.onCollisionCallback = state.onCollisionCallback;
    this.loadState(state);
  }

  collide(otherEntity: Entity, started: boolean): void {
    if (this.onCollisionCallback) {
      this.onCollisionCallback(otherEntity, started);
    } else {
      this.removeFromEntity();
    }
  }
  
  onUpdate(args: UpdateArgs): void { }
  onDispose(): void { }

  saveState(): EntityComponentState {
    return super.saveState();
  }

  loadState(state: EntityComponentState): void {
    // No additional state to load for this component  
  }
}